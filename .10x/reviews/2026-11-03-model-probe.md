# Model probe — 2026-11-03

Weights: Space `AdejareworkStudio/Breast_cancer_predictor` @ `937bd46551e789808939a8b127ca9f26b88b4314`.
Run twice: against the live Space API, and locally through `scripts/probe_model.py` with the rebuilt
torchvision architectures (strict state-dict loading). Both gave identical numbers.

## Image type detector (ResNet-50 + 2-class head)
- 12/12 BUSI ultrasound images: "ultrasound", 100%.
- Random noise and a synthetic gradient: "mammogram", 100%. **It cannot reject non-breast images.**

## Ultrasound specialist (EfficientNet-B0)
| Image | Benign | Malignant | Normal | Match |
|---|---|---|---|---|
| benign (1) | 77.0 | 19.6 | 3.4 | yes |
| benign (10) | 89.3 | 3.8 | 6.8 | yes |
| benign (50) | 95.0 | 2.1 | 2.9 | yes |
| benign (100) | 95.7 | 2.7 | 1.6 | yes |
| benign (200) | 91.2 | 5.5 | 3.4 | yes |
| malignant (10) | 87.9 | 8.7 | 3.4 | **no** |
| malignant (50) | 1.2 | 98.4 | 0.5 | yes |
| malignant (100) | 24.3 | 73.5 | 2.2 | yes |
| malignant (150) | 2.7 | 96.3 | 0.9 | yes |
| normal (10) | 10.0 | 1.3 | 88.7 | yes |
| normal (50) | 8.1 | 2.8 | 89.0 | yes |
| normal (100) | 22.5 | 58.3 | 19.2 | **no** |

10/12. The class order (Benign, Malignant, Normal) is confirmed. BUSI may overlap the training data, so this is a sanity check, not accuracy. **Verdict: trusted to score.**

## Mammogram specialist
- The file holds EfficientNet-B0 with a Linear(1280→512) → BN → ReLU → Linear(512→3) head. The Space's loader built a one-layer head, so this model **never loaded on the Space**; mammogram-typed images were silently scored by the ultrasound model.
- Loads correctly in the rebuild. No labelled mammograms were available to probe (the CBIS-DDSM mirror is raw DICOM). **Verdict: off until probed.**

## Clinical TabNet (9 features)
| Case | Benign | Malignant | Normal |
|---|---|---|---|
| BI-RADS 2, oval, circumscribed | 0 | 0 | 100 |
| BI-RADS 3, round, circumscribed | 0 | 0 | 100 |
| BI-RADS 4, irregular, spiculated | 100 | 0 | 0 |
| BI-RADS 5, irregular, spiculated | 100 | 0 | 0 |
| BI-RADS 6, irregular, indistinct | 0 | 0 | 100 |

It never predicts Malignant. Low-risk and biopsy-proven cases get the same class, so no reordering of the labels can fix it. No scaler was saved with the model. **Verdict: disabled; retrain with a saved scaler and label map.**

## Council review (llm-council, 5 advisors)
They agreed unanimously: hide the clinical output entirely (not greyed), drop any configurable label order, show the agreement strip only with two trusted experts, pin the weights revision, probe the image models too, and watermark printed reports. All of this was adopted.
