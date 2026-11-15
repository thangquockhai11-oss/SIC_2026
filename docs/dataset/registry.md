# Dataset Registry

Backend seeds 16 metadata records from proposed sources. Every record, license and schema is UNVERIFIED. The catalog does not establish reuse rights; no dataset content is downloaded.

Before use, verify exact artifact and record version, terms/license, schema/labels, language, download date, preprocessing and train/validation/test split. Do not merge label constructs into Fake/Real.

API: GET /api/v1/datasets supports page, page_size, category, status, language and q.

Seed groups: fact-checking (FEVER, ViFactCheck, X-FACT, FEVEROUS); media credibility (NELA-GT, News Media Reliability); public opinion (TweetEval, GoEmotions, UIT-VSFC, UIT-VSMEC, PHEME, MuMiN); public trust (World Values Survey, Reuters Institute Digital News Report); information reception (Microsoft MIND, planned custom survey).

Some sources contain releases with different access terms. Verify the exact artifact before download or publication.
