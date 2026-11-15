---
language:
- vi
license: mit
task_categories:
- text-classification
- question-answering
task_ids:
- natural-language-inference
- fact-checking
- fact-checking-retrieval
multilinguality:
- monolingual
size_categories:
- 1K<n<10K
source_datasets:
- original
pretty_name: ViFactCheck
arxiv: 2412.15308
tags:
- fact-checking
- vietnamese
- NLP
- misinformation
- fake-news
- claim-verification
- natural-language-inference
- low-resource
- news
- benchmark
- AAAI
- AAAI-25
- multi-domain
- evidence-retrieval
---

# ViFactCheck: A Multi-Domain Vietnamese News Fact-Checking Benchmark

## Dataset Summary

**ViFactCheck** is the **first publicly available benchmark dataset** for multi-domain news fact-checking in Vietnamese. It contains **7,232 human-annotated claim–evidence pairs** sourced from nine reputable Vietnamese online news outlets, spanning **12 diverse topics**. Each entry pairs a claim with its full article context and annotated evidence, labeled as *Supported*, *Refuted*, or *Not Enough Information (NEI)*.

---

## Dataset Structure

### Data Fields

| Field | Type | Description |
|---|---|---|
| `Statement` | `string` | The claim to be verified (in Vietnamese) |
| `Context` | `string` | Full article context from which the claim was derived |
| `Evidence` | `string` | Annotated gold evidence snippet(s) supporting the label |
| `Topic` | `string` | News domain/topic (12 categories, see below) |
| `Author` | `string` | Source newspaper (one of 9 licensed outlets) |
| `Url` | `string` | URL of the original news article |
| `labels` | `int64` | Fact-checking label: `0` = Supported, `1` = Refuted, `2` = NEI |
| `annotation_id` | `int64` | Unique annotation identifier |
| `index` | `int64` | Original dataset index |

### Label Distribution

| Label | ID | Meaning |
|---|---|---|
| Supported | `0` | The context/evidence supports the claim |
| Refuted | `1` | The context/evidence contradicts the claim |
| NEI | `2` | Not Enough Information to verify the claim |

### Topics Covered (12 Domains)

The dataset spans 12 diverse Vietnamese news domains including:
Politics, Law & Justice, Business & Economics, Education, Urban Affairs, Sports, Youth & Society, Culture, Environment, Health, Technology, and Entertainment.

---

## Usage

```python
from datasets import load_dataset

dataset = load_dataset("tranthaihoa/vifactcheck")

# Access splits
train = dataset["train"]
dev   = dataset["dev"]
test  = dataset["test"]

# Example entry
print(train[0]["Statement"])   # The claim (Vietnamese)
print(train[0]["Evidence"])    # Gold evidence
print(train[0]["labels"])      # 0=Supported, 1=Refuted, 2=NEI
```

```python
import pandas as pd

df = pd.read_parquet("hf://datasets/tranthaihoa/vifactcheck/default/train-00000-of-00001.parquet")
```

---

## Citation

If you use ViFactCheck in your research, please cite:

```bibtex
@inproceedings{tran2025vifactcheck,
  title     = {ViFactCheck: A New Benchmark Dataset and Methods for Multi-Domain News Fact-Checking in Vietnamese},
  author    = {Tran, Thai Hoa and Tran, Quang Duy and Tran, Khanh Quoc and Nguyen, Kiet Van},
  booktitle = {Proceedings of the Thirty-Ninth AAAI Conference on Artificial Intelligence (AAAI-25)},
  pages     = {308--316},
  year      = {2025},
  publisher = {AAAI Press}
}
```

---

📧 Contact: `{khanhtq,kietnv}@uit.edu.vn`

This research was supported by the Scientific Research Support Fund of VNUHCM-University of Information Technology.