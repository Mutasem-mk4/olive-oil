# Accuracy Plan

## Current Models

- Camera classifier: Azure Custom Vision `ZaytounModel`
- Camera classes: `pure_evoo`, `light_adulteration`, `heavy_adulteration`
- Primary live camera model: physics-informed UV fluorescence index classifier
- EEM quality model: `vote_xgboost_logistic_histgb`
- Public EEM adulteration model: `vote_xgboost_extra_trees_svm`
- Final app verdict: fluorescence index primary, Azure Custom Vision as supporting evidence

## Public Fluorescence Dataset

The project now includes a reproducible public-data path using Zenodo record `19755088`.

```bash
py -3.12 backend/build_zenodo_eem_dataset.py
py -3.12 backend/train_zenodo_adulteration_model.py
```

Generated dataset:

- File: `data/processed/zenodo_eem_adulteration_features.csv`
- Rows: 314
- Classes: `pure_evoo_proxy`, `light_adulteration`, `heavy_adulteration`
- Selected model: `vote_xgboost_extra_trees_svm`
- Holdout balanced accuracy: 0.9621
- Group-CV balanced accuracy: 0.8867

Important limitation: `pure_evoo_proxy` is the highest olive-oil-ratio class available in that archive, not guaranteed 100% pure EVOO.

## Capture Protocol

Use the same physical setup for every class:

1. 365 nm UV lamp.
2. Darkbox or dark background.
3. Fixed lamp distance from the sample.
4. Fixed camera distance and angle.
5. Same clear vial or cup.
6. Sharp focus on the liquid layer.
7. At least three brands or sources for each class.

## Dataset Targets

Minimum demo target:

- `pure_evoo`: 50-100 images
- `light_adulteration`: 50-100 images
- `heavy_adulteration`: 50-100 images

Production target:

- 200+ images per class
- Add `old_real_evoo` to prevent old authentic oil from being mislabeled as fake
- Add mixture percentages: 10%, 25%, 50%, 75%

## Blind Test Rule

Keep 20-30% of images out of Azure training. Put those files under:

```text
data/blind_test/
  pure_evoo/
  light_adulteration/
  heavy_adulteration/
```

Never upload the blind-test images to Azure training. Use them only for final accuracy measurement.

## Evaluation Command

Set the Azure Custom Vision prediction environment variables, then run:

```bash
py -3.12 backend/evaluate_camera_dataset.py data/blind_test --output camera_eval_results.csv
```

The script prints overall accuracy, per-class accuracy, and a confusion matrix. It also writes per-image predictions to CSV.

## Final Verdict Logic

The app gives a high-confidence final result only when the Azure camera classifier and UV spectral rules agree.

- Agreement on authentic: final authentic verdict.
- Agreement on adulterated: final adulteration-risk verdict.
- Disagreement or inconclusive signal: retest required.
- Azure unavailable: spectral-only field-screening verdict.

This reduces confident wrong answers, which matters more than showing a high number in a live demo.
