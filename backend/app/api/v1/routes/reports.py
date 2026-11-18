"""Report generation and export endpoints (JSON, CSV, HTML)."""

import csv
from io import StringIO
import json

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session, joinedload

from app.database.dependencies import get_db_session
from app.database.models import Analysis, Claim

router = APIRouter(prefix="/reports")

VERDICT_VI_MAP = {
    "SUPPORTED": "Được bằng chứng hỗ trợ",
    "REFUTED": "Bị bằng chứng bác bỏ",
    "PARTIALLY_SUPPORTED": "Đúng một phần",
    "MISLEADING": "Gây hiểu lầm",
    "CONFLICTING_EVIDENCE": "Bằng chứng mâu thuẫn",
    "NOT_ENOUGH_INFORMATION": "Chưa đủ bằng chứng",
    "INSUFFICIENT_EVIDENCE": "Chưa đủ bằng chứng",
    "NOT_CHECKABLE": "Không thể kiểm chứng",
    "ABSTAIN": "Từ chối kết luận do thiếu căn cứ",
    "UNRESOLVED": "Chưa giải quyết được",
}

STANCE_VI_MAP = {
    "SUPPORTS": "Ủng hộ",
    "SUPPORTED": "Ủng hộ",
    "REFUTES": "Bác bỏ",
    "REFUTED": "Bác bỏ",
    "NEUTRAL": "Trung lập",
    "NOT_ENOUGH_INFO": "Chưa đủ dữ kiện",
}


@router.get("/{analysis_id}/export", summary="Export analysis report in JSON or CSV format")
def export_report(
    analysis_id: str,
    export_format: str = Query(default="json", alias="format"),
    db: Session = Depends(get_db_session),
) -> Response:
    """Generate structured research export file."""
    analysis = (
        db.query(Analysis)
        .options(
            joinedload(Analysis.claims).joinedload(Claim.evidences),
            joinedload(Analysis.credibility),
            joinedload(Analysis.opinion),
            joinedload(Analysis.survey),
            joinedload(Analysis.reception),
        )
        .filter(Analysis.id == analysis_id)
        .first()
    )
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Báo cáo phân tích không tồn tại",
        )

    if export_format.lower() == "csv":
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["Tiêu đề báo cáo", analysis.title])
        writer.writerow(["Kết luận toàn bài", VERDICT_VI_MAP.get(analysis.verdict, analysis.verdict or "Chưa có")])
        writer.writerow(["Độ tin cậy hiệu chuẩn", f"{int((analysis.confidence_score or 0.0) * 100)}%"])
        writer.writerow(["Đơn vị AI", analysis.ai_provider])
        writer.writerow(["Thời điểm tạo", analysis.created_at.isoformat()])
        writer.writerow([])
        writer.writerow(["Mã tuyên bố", "Nội dung tuyên bố", "Kết luận", "Độ tin cậy", "Cơ sở đánh giá"])
        for c in analysis.claims:
            writer.writerow([
                c.id,
                c.claim_text,
                VERDICT_VI_MAP.get(c.verdict, c.verdict),
                f"{int((c.confidence or 0.0) * 100)}%",
                c.reasoning,
            ])
        writer.writerow([])
        writer.writerow(["Mã bằng chứng", "Mã tuyên bố", "Tên nguồn tham chiếu", "URL nguồn", "Lập trường", "Độ tin cậy", "Nội dung trích dẫn"])
        for c in analysis.claims:
            for e in c.evidences:
                writer.writerow([
                    e.id,
                    c.id,
                    e.source_name,
                    e.source_url or "",
                    STANCE_VI_MAP.get(e.stance, e.stance),
                    f"{int((e.reliability_score or 0.0) * 100)}%",
                    e.excerpt,
                ])

        csv_content = output.getvalue()
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=trustmedia_report_{analysis_id}.csv"},
        )

    # Default JSON export
    data = {
        "report_id": analysis.id,
        "title": analysis.title,
        "source_url": analysis.source_url,
        "language": analysis.language,
        "scope": analysis.scope,
        "status": analysis.status,
        "verdict": analysis.verdict,
        "verdict_vietnamese": VERDICT_VI_MAP.get(analysis.verdict, analysis.verdict),
        "confidence_score": analysis.confidence_score,
        "summary": analysis.summary,
        "ai_provider": analysis.ai_provider,
        "created_at": analysis.created_at.isoformat(),
        "disclaimer": "Báo cáo này được tạo bởi TrustMedia AI nhằm mục đích nghiên cứu và hỗ trợ kiểm chứng thông tin số. Kết quả không thay thế phán quyết pháp lý chính thức.",
        "claims": [
            {
                "id": c.id,
                "text": c.claim_text,
                "verdict": c.verdict,
                "verdict_vietnamese": VERDICT_VI_MAP.get(c.verdict, c.verdict),
                "confidence": c.confidence,
                "reasoning": c.reasoning,
                "limitations": c.limitations,
                "evidences": [
                    {
                        "source": e.source_name,
                        "url": e.source_url,
                        "stance": e.stance,
                        "stance_vietnamese": STANCE_VI_MAP.get(e.stance, e.stance),
                        "reliability": e.reliability_score,
                        "excerpt": e.excerpt,
                        "retrieved_at": e.retrieval_timestamp.isoformat() if e.retrieval_timestamp else None,
                    }
                    for e in c.evidences
                ],
            }
            for c in analysis.claims
        ],
        "media_credibility": {
            "source_name": analysis.credibility.source_name,
            "domain": analysis.credibility.domain,
            "transparency_score": analysis.credibility.transparency_score,
            "citation_score": analysis.credibility.citation_score,
            "evidence_score": analysis.credibility.evidence_score,
            "overall_credibility_score": analysis.credibility.overall_credibility_score,
            "reasoning": analysis.credibility.reasoning,
        } if analysis.credibility else None,
    }
    return Response(
        content=json.dumps(data, ensure_ascii=False, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=trustmedia_report_{analysis_id}.json"},
    )


@router.get("/{analysis_id}/html", response_class=HTMLResponse, summary="View publication-ready HTML report")
def view_html_report(
    analysis_id: str,
    db: Session = Depends(get_db_session),
) -> HTMLResponse:
    """Render a clean, printable research report with academic formatting in Vietnamese."""
    analysis = (
        db.query(Analysis)
        .options(
            joinedload(Analysis.claims).joinedload(Claim.evidences),
            joinedload(Analysis.credibility),
            joinedload(Analysis.opinion),
        )
        .filter(Analysis.id == analysis_id)
        .first()
    )
    if not analysis:
        raise HTTPException(status_code=404, detail="Báo cáo phân tích không tồn tại")

    claims_html = ""
    for idx, c in enumerate(analysis.claims, 1):
        v_vi = VERDICT_VI_MAP.get(c.verdict, c.verdict or "Chưa đủ bằng chứng")
        badge_color = "#e11d48" if c.verdict == "REFUTED" else "#059669" if c.verdict == "SUPPORTED" else "#d97706"
        claims_html += f"""
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; background: #ffffff;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap;">
                <div>
                    <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Tuyên bố #{idx}</span>
                    <h4 style="margin: 4px 0 0; color: #1e293b; font-size: 15px;">&ldquo;{c.claim_text}&rdquo;</h4>
                </div>
                <span style="background: {badge_color}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; white-space: nowrap;">
                    {v_vi} ({int((c.confidence or 0.0) * 100)}%)
                </span>
            </div>
            <p style="color: #475569; font-size: 13px; margin: 10px 0 6px;"><strong>Cơ sở xác minh:</strong> {c.reasoning}</p>
        """
        if c.limitations:
            claims_html += f"""<p style="color: #b45309; font-size: 12px; margin: 4px 0 8px;"><strong>Giới hạn:</strong> {c.limitations}</p>"""

        if c.evidences:
            claims_html += """
            <div style="margin-top: 10px; background: #f8fafc; padding: 10px 14px; border-radius: 6px; border: 1px solid #edf2f7;">
                <strong style="font-size: 12px; color: #334155;">Bằng chứng đối chiếu độc lập:</strong>
                <ul style="margin: 6px 0 0; padding-left: 20px; font-size: 12px; color: #64748b;">
            """
            for e in c.evidences:
                st_vi = STANCE_VI_MAP.get(e.stance, e.stance)
                claims_html += f"""<li style="margin-bottom: 4px;"><strong>{e.source_name}</strong>: <em>&ldquo;{e.excerpt}&rdquo;</em> (Lập trường: <strong>{st_vi}</strong> &bull; Độ tin cậy: {int((e.reliability_score or 0.0) * 100)}%)</li>"""
            claims_html += "</ul></div>"
        else:
            claims_html += """<div style="margin-top: 8px; font-size: 12px; color: #94a3b8; font-style: italic;">Chưa có tài liệu đối soát độc lập trong cơ sở tri thức đối chuẩn.</div>"""

        claims_html += "</div>"

    overall_v_vi = VERDICT_VI_MAP.get(analysis.verdict, analysis.verdict or "Đang chờ")

    html_content = f"""
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <title>TrustMedia AI - Báo cáo kiểm chứng bài báo: {analysis.title}</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1e293b; background: #f8fafc; padding: 40px; margin: 0; }}
            .container {{ max-width: 900px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }}
            h1 {{ color: #0f172a; margin-top: 8px; font-size: 22px; line-height: 1.4; }}
            .meta {{ color: #64748b; font-size: 13px; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; }}
            .summary-box {{ background: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; border-radius: 4px; margin-bottom: 24px; }}
            .disclaimer {{ margin-top: 40px; padding: 12px 16px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; font-size: 12px; color: #92400e; }}
            @media print {{ body {{ background: white; padding: 0; }} .container {{ box-shadow: none; padding: 0; }} button {{ display: none; }} }}
        </style>
    </head>
    <body>
        <div class="container">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 800; color: #0d9488; letter-spacing: 0.5px;">TRUSTMEDIA AI &bull; BÁO CÁO KIỂM CHỨNG BÀI BÁO</span>
                <button onclick="window.print()" style="padding: 6px 14px; background: #0f172a; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">In / Xuất PDF</button>
            </div>
            <h1>{analysis.title}</h1>
            <div class="meta">
                <div><strong>Mã báo cáo:</strong> {analysis.id} &bull; <strong>Thời điểm phân tích:</strong> {analysis.created_at.strftime('%d/%m/%Y %H:%M:%S')}</div>
                <div><strong>Kết luận toàn bài:</strong> <span style="font-weight: 700;">{overall_v_vi}</span> &bull; <strong>Độ tin cậy hiệu chuẩn:</strong> {int((analysis.confidence_score or 0.0) * 100)}%</div>
                <div><strong>Nguồn tham chiếu:</strong> {analysis.source_url or 'Dán văn bản trực tiếp'}</div>
            </div>

            <div class="summary-box">
                <h3 style="margin-top: 0; color: #1e3a8a; font-size: 15px;">Kết luận tổng hợp của Tác nhân Điều phối (Meta-Agent):</h3>
                <p style="margin-bottom: 0; color: #1e40af; font-size: 14px;">{analysis.summary or 'Chưa có kết luận tổng hợp.'}</p>
            </div>

            <h3 style="font-size: 16px; color: #0f172a; margin-top: 24px;">Chi tiết các Tuyên bố cần kiểm chứng &amp; Bằng chứng độc lập:</h3>
            {claims_html}

            <div class="disclaimer">
                <strong>Nguyên tắc liêm chính &amp; Giới hạn khoa học:</strong> Báo cáo được lập tự động bởi hệ sinh thái đa tác nhân TrustMedia AI trên cơ sở đối chiếu bằng chứng đa nguồn qua Hybrid RAG (pgvector, BM25, BGE Reranker) và mô hình NLI hiệu chuẩn. Kết luận độc lập với mức độ uy tín của tòa soạn xuất bản. Kết quả không thay thế cho phán quyết pháp lý của cơ quan chức năng có thẩm quyền.
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)
