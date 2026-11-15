
# Tuberculosis (TB) — Final Model Results

## Model

- Architecture: Early-Fusion DenseNet-121
- Inputs: Chest X-ray, age, and sex
- Fusion method: 5-channel early fusion
  - 3 RGB image channels
  - 1 normalized age channel
  - 1 encoded sex channel
- Dataset: Shenzhen chest X-ray dataset
- Total images: 662
- Train: 463
- Validation: 99
- Held-out test: 100

## Final Held-Out Test Results

| Metric | Result |
|---|---:|
| AUROC | 0.97559 |
| Accuracy at screening threshold | 90.00% |
| Sensitivity at screening threshold | 94.12% |
| Specificity at screening threshold | 85.71% |
| F1-score at screening threshold | 0.90566 |
| Brier score | 0.082595 |

## Confusion Matrix at Screening Threshold

| | Predicted Normal | Predicted TB |
|---|---:|---:|
| Actual Normal | 42 | 7 |
| Actual TB | 3 | 48 |

## Standard Threshold (0.5) Comparison

| Metric | Result |
|---|---:|
| Accuracy | 89.00% |
| Sensitivity | 80.39% |
| Specificity | 97.96% |
| F1-score | 0.88172 |

## Deployment

- Inference module: backend/services/tb_early_fusion_inference.py
- Service: backend/services/tb_service.py
- API router: backend/services/tb_router.py
- Frontend: frontend/src/components/ridhima/TBImageUpload.jsx
- Configuration: models/tb/tb_early_fusion_deployment_config.json
- Model checkpoint: tb_early_fusion_best.pth
- CPU median inference latency: 168.44 ms in Google Colab

The checkpoint is stored separately and is not committed
to GitHub.

## Limitations

- Research prototype only; not clinically validated.
- Evaluation uses a single dataset and a 100-image held-out
  test set.
- The model score is an uncalibrated softmax score, not a
  clinical disease probability.
- No external validation has been completed.
- The model must not be used for autonomous TB diagnosis.
- A negative screening flag does not rule out tuberculosis.
