---
license: mit
task_categories:
- text-classification
language:
- ar
- bn
- es
- fa
- id
- it
- hi
- gu
- ka
- mr
- pa
- pl
- pt
- ro
- 'no'
- si
- sr
- ta
- sq
- ru
- tr
- az
- de
- nl
- fr
pretty_name: 'X-FACT: Multilingual Fact Checking'
size_categories:
- 10K<n<100K
configs:
- config_name: all_languages
  data_files:
    - split: train
      path: all_languages/train*
    - split: dev
      path: all_languages/dev*
    - split: test
      path: all_languages/test*
    - split: ood
      path: all_languages/ood*
    - split: zeroshot
      path: all_languages/zeroshot*
- config_name: ar
  data_files:
    - split: train
      path: ar/train*
    - split: dev
      path: ar/dev*
    - split: test
      path: ar/test*
- config_name: az
  data_files:
    - split: zeroshot
      path: az/zeroshot*
- config_name: bn
  data_files:
    - split: zeroshot
      path: bn/zeroshot*
- config_name: de
  data_files:
    - split: train
      path: de/train*
    - split: dev
      path: de/dev*
    - split: test
      path: de/test*
- config_name: es
  data_files:
    - split: train
      path: es/train*
    - split: dev
      path: es/dev*
    - split: test
      path: es/test*
- config_name: fa
  data_files:
    - split: zeroshot
      path: fa/zeroshot*
- config_name: fr
  data_files:
    - split: zeroshot
      path: fr/zeroshot*
- config_name: gu
  data_files:
    - split: zeroshot
      path: gu/zeroshot*
- config_name: hi
  data_files:
    - split: train
      path: hi/train*
    - split: dev
      path: hi/dev*
    - split: test
      path: hi/test*
    - split: ood
      path: hi/ood*
- config_name: id
  data_files:
    - split: train
      path: id/train*
    - split: dev
      path: id/dev*
    - split: test
      path: id/test*
    - split: ood
      path: id/ood*
- config_name: it
  data_files:
    - split: train
      path: it/train*
    - split: dev
      path: it/dev*
    - split: test
      path: it/test*
    - split: ood
      path: it/ood*
- config_name: ka
  data_files:
    - split: train
      path: ka/train*
    - split: dev
      path: ka/dev*
    - split: test
      path: ka/test*
- config_name: mr
  data_files:
    - split: zeroshot
      path: mr/zeroshot*
- config_name: nl
  data_files:
    - split: zeroshot
      path: nl/zeroshot*
- config_name: 'no'
  data_files:
    - split: zeroshot
      path: no/zeroshot*
- config_name: pa
  data_files:
    - split: zeroshot
      path: pa/zeroshot*
- config_name: pl
  data_files:
    - split: train
      path: pl/train*
    - split: dev
      path: pl/dev*
    - split: test
      path: pl/test*
- config_name: pt
  data_files:
    - split: train
      path: pt/train*
    - split: dev
      path: pt/dev*
    - split: test
      path: pt/test*
    - split: ood
      path: pt/ood*
- config_name: ro
  data_files:
    - split: train
      path: ro/train*
    - split: dev
      path: ro/dev*
    - split: test
      path: ro/test*
- config_name: ru
  data_files:
    - split: zeroshot
      path: ru/zeroshot*
- config_name: si
  data_files:
    - split: zeroshot
      path: si/zeroshot*
- config_name: sq
  data_files:
    - split: zeroshot
      path: sq/zeroshot*
- config_name: sr
  data_files:
    - split: train
      path: sr/train*
    - split: dev
      path: sr/dev*
    - split: test
      path: sr/test*
- config_name: ta
  data_files:
    - split: train
      path: ta/train*
    - split: dev
      path: ta/dev*
    - split: test
      path: ta/test*
- config_name: tr
  data_files:
    - split: train
      path: tr/train*
    - split: dev
      path: tr/dev*
    - split: test
      path: tr/test*
    - split: ood
      path: tr/ood*
---

# Dataset Card for "x-fact"

## Table of Contents
- [Dataset Description](#dataset-description)
  - [Dataset Summary](#dataset-summary)
  - [Languages](#languages)
  - [Data Splits](#data-splits)
- [Additional Information](#additional-information)
  - [Citation Information](#citation-information)

## Dataset Description

### Dataset Summary

X-FACT is a multilingual dataset for fact-checking with real world claims. The dataset contains short statments in 25 languages with top five evidence documents retrieved by performing google search with claim statements. The dataset contains two additional evaluation splits (in addition to a traditional `test` set): `ood` and `zeroshot`. `ood` measures out-of-domain generalization where while the language is present in the training data, the claim statements are taken from a different fact-checker.  `zeroshot` on the other hand measures the cross lingual abilities to transfer to new languages. In total, the dataset contains 31,189 claim statments.  

Github: [https://github.com/utahnlp/x-fact](https://github.com/utahnlp/x-fact) 

### Languages
The dataset contains claims from 25 languages (with and without training data):

With training data: `ar`, `de`, `es`, `hi`, `id`, `it`, `ka`, `pl`, `pt`, `ro`, `sr`, `ta`, `tr`

Without training data (only zeroshot): `az`, `bn`, `fa`, `fr`, `gu`, `mr`, `nl`, `no`, `pa`, `ru`, `si`, `sq`

### Data Splits

|Split |# claims|# languages|
|------|-------:|----------:|
|train|   19079|         13|
|dev|    2535|         12|
|test (in-domain)|    3826|         12|
|ood (out-of-domain)|    2368|          4|
|zeroshot|    3381|         12|

## Additional Information

### Citation Information
```
@inproceedings{gupta2021xfact,
      title={{X-FACT: A New Benchmark Dataset for Multilingual Fact Checking}}, 
      author={Gupta, Ashim and Srikumar, Vivek},
      booktitle = "Proceedings of the 59th Annual Meeting of the Association for Computational Linguistics",      
      month = jul,
      year = "2021",
      address = "Online",
      publisher = "Association for Computational Linguistics",
}
```

