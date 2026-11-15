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
            detail="Analysis report not found",
        )

    if export_format.lower() == "csv":
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["Report Title", analysis.title])
        writer.writerow(["Verdict", analysis.verdict or "N/A"])
        writer.writerow(["Confidence", analysis.confidence_score or 0.0])
        writer.writerow(["AI Provider", analysis.ai_provider])
        writer.writerow(["Date", analysis.created_at.isoformat()])
        writer.writerow([])
        writer.writerow(["Claim ID", "Claim Text", "Verdict", "Confidence", "Reasoning"])
        for c in analysis.claims:
            writer.writerow([c.id, c.claim_text, c.verdict, c.confidence, c.reasoning])
        writer.writerow([])
        writer.writerow(["Evidence ID", "Claim ID", "Source Name", "Source URL", "Stance", "Reliability", "Excerpt"])
        for c in analysis.claims:
            for e in c.evidences:
                writer.writerow([e.id, c.id, e.source_name, e.source_url or "", e.stance, e.reliability_score, e.excerpt])

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
        "confidence_score": analysis.confidence_score,
        "summary": analysis.summary,
        "ai_provider": analysis.ai_provider,
        "created_at": analysis.created_at.isoformat(),
        "disclaimer": "This report is generated for digital media research assistance. Final journalistic attribution requires independent primary source corroboration.",
        "claims": [
            {
                "id": c.id,
                "text": c.claim_text,
                "verdict": c.verdict,
                "confidence": c.confidence,
                "reasoning": c.reasoning,
                "limitations": c.limitations,
                "evidences": [
                    {
                        "source": e.source_name,
                        "url": e.source_url,
                        "stance": e.stance,
                        "reliability": e.reliability_score,
                        "excerpt": e.excerpt,
                        "retrieved_at": e.retrieval_timestamp.isoformat(),
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
    """Render a clean, printable research report with academic formatting."""
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
        raise HTTPException(status_code=404, detail="Analysis report not found")

    claims_html = ""
    for c in analysis.claims:
        badge_color = "#e05252" if c.verdict == "REFUTED" else "#22a06b" if c.verdict == "SUPPORTED" else "#e5a122"
        claims_html += f"""
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h4 style="margin: 0; color: #1e293b;">{c.claim_text}</h4>
                <span style="background: {badge_color}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold;">{c.verdict} ({int(c.confidence*100)}%)</span>
            </div>
            <p style="color: #475569; font-size: 14px; margin-top: 8px;"><strong>Cơ sở đánh giá:</strong> {c.reasoning}</p>
            <div style="margin-top: 10px; background: #f8fafc; padding: 10px; border-radius: 6px;">
                <strong style="font-size: 13px; color: #334155;">Bằng chứng đối chiếu:</strong>
                <ul style="margin: 6px 0 0; padding-left: 20px; font-size: 13px; color: #64748b;">
        """
        for e in c.evidences:
            claims_html += f"<li><strong>{e.source_name}</strong>: <em>\"{e.excerpt}\"</em> ({e.stance} - Tin cậy: {int(e.reliability_score*100)}%)</li>"
        claims_html += "</ul></div></div>"

    html_content = f"""
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <title>TrustMedia AI Report - {analysis.title}</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1e293b; background: #f8fafc; padding: 40px; }}
            .container {{ max-width: 900px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }}
            h1 {{ color: #0f172a; margin-top: 0; font-size: 24px; }}
            .meta {{ color: #64748b; font-size: 13px; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; }}
            .summary-box {{ background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px; margin-bottom: 24px; }}
            .disclaimer {{ margin-top: 40px; padding: 12px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; font-size: 12px; color: #92400e; }}
            @media print {{ body {{ background: white; padding: 0; }} .container {{ box-shadow: none; padding: 0; }} }}
        </style>
    </head>
    <body>
        <div class="container">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 800; color: #0d9488; letter-spacing: 1px;">TRUSTMEDIA AI RESEARCH PLATFORM</span>
                <button onclick="window.print()" style="padding: 6px 14px; background: #0f172a; color: white; border: none; border-radius: 6px; cursor: pointer;">In / Xuất PDF</button>
            </div>
            <h1>BÁO CÁO NGHIÊN CỨU KIỂM CHỨNG TRUYỀN THÔNG SỐ</h1>
            <div class="meta">
                <div><strong>Tiêu đề:</strong> {analysis.title}</div>
                <div><strong>Mã báo cáo:</strong> {analysis.id} | <strong>Ngày tạo:</strong> {analysis.created_at.strftime('%Y-%m-%d %H:%M:%S UTC')}</div>
                <div><strong>AI Provider:</strong> {analysis.ai_provider}</div>
            </div>

            <div class="summary-box">
                <h3 style="margin-top: 0; color: #1e3a8a;">Kết luận tổng hợp của Hệ thống Đa tác tử (Meta-Agent):</h3>
                <p style="margin-bottom: 0; color: #1e40af;">{analysis.summary or 'Chưa có kết luận tổng hợp.'}</p>
            </div>

            <h3>Chi tiết các Phát ngôn (Claims) và Bằng chứng:</h3>
            {claims_html}

            <div class="disclaimer">
                <strong>Giới hạn khoa học & Khuyến cáo:</strong> Báo cáo được tạo tự động bởi nền tảng TrustMedia AI nhằm mục đích nghiên cứu và hỗ trợ kiểm chứng thông tin số. Kết quả không thay thế cho phán quyết pháp lý hay kết luận chính thức của cơ quan nhà nước có thẩm quyền.
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

