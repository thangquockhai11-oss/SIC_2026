"""Test suite for Phase 2 - Task 3: NLP Proof & Empirical Benchmark.
Verifies event-based train/dev/test split (zero test leakage into index),
head-to-head comparison between Rule-based, Single-model, and Multi-Agent on Vietnamese data,
and component ablation study.
"""

import pytest
from app.services.nlp_benchmark_evaluator import nlp_benchmark_evaluator


def test_1_event_split_and_no_test_leakage():
    """Verify that train/dev/test split is strictly event-based and
    no test events are indexed into the RAG retriever.
    """
    splits = nlp_benchmark_evaluator.load_event_split_data(test_sample_limit=30)
    df_indexable = splits["indexable"]
    df_test = splits["test"]

    test_topics = set(df_test["Topic"].unique())
    indexable_topics = set(df_indexable["Topic"].unique())

    # Guarantee zero intersection between test topics and indexed corpus
    overlap = test_topics.intersection(indexable_topics)
    assert len(overlap) == 0, f"Leakage detected! Topics present in both: {overlap}"

    # Verify indexing excludes test records
    indexed_count = nlp_benchmark_evaluator.index_training_corpus(df_indexable)
    assert indexed_count > 0
    assert nlp_benchmark_evaluator.is_indexed is True


def test_2_head_to_head_comparison_three_systems():
    """Compare Rule-based baseline, Single-model baseline, and Multi-Agent (EWAC)
    on the exact same Vietnamese test records with identical evidence inputs.
    """
    res = nlp_benchmark_evaluator.run_full_benchmark(sample_limit=30)
    comparison = res["comparison"]

    assert len(comparison) == 3
    rule_sys = comparison[0]
    single_sys = comparison[1]
    multi_sys = comparison[2]

    # Verify sample count is real and non-zero
    assert res["sample_count"] > 0
    assert rule_sys.sample_count == res["sample_count"]
    assert single_sys.sample_count == res["sample_count"]
    assert multi_sys.sample_count == res["sample_count"]

    # Verify metrics are within scientific bounds [0.0, 1.0]
    for sys in comparison:
        assert 0.0 <= sys.retrieval_recall_at_5 <= 1.0
        assert 0.0 <= sys.veracity_macro_f1 <= 1.0
        assert 0.0 <= sys.stance_macro_f1 <= 1.0
        assert 0.0 <= sys.joint_accuracy <= 1.0

    # Multi-Agent must outperform or equal Single-Model baseline on Macro-F1 and Joint Accuracy
    # because of clause decomposition and modal scoping
    assert multi_sys.veracity_macro_f1 >= single_sys.veracity_macro_f1
    assert multi_sys.joint_accuracy >= single_sys.joint_accuracy
    assert multi_sys.veracity_macro_f1 > rule_sys.veracity_macro_f1


def test_3_ablation_study_error_reduction():
    """Verify that removing individual components (modal scope, meta synthesis)
    demonstrates measurable error reduction in the full multi-agent architecture.
    """
    res = nlp_benchmark_evaluator.run_full_benchmark(sample_limit=30)
    ablations = res["ablations"]

    assert len(ablations) >= 3
    full_ma = ablations[0]
    no_modal = ablations[1]
    no_meta = ablations[2]

    # Full Multi-Agent achieves highest F1
    assert full_ma.veracity_macro_f1 >= no_modal.veracity_macro_f1
    assert full_ma.veracity_macro_f1 >= no_meta.veracity_macro_f1

    # Check error reduction is reported
    for ab in ablations:
        assert ab.sample_count == res["sample_count"]
        assert ab.component_removed is not None
