# Deployment

Deployed via Kubernetes in `statex-apps` namespace.

## Deploy

```bash
./scripts/deploy.sh
```

Or smart (only changed services):
```bash
cd ../nginx-microservice && ./scripts/blue-green/deploy-smart.sh flipflop
```

## Ops

```bash
kubectl get pods -n statex-apps -l app=flipflop          # pod status
kubectl logs -n statex-apps deploy/flipflop-api-gateway --tail=100
kubectl rollout restart deploy/flipflop-api-gateway -n statex-apps
```

> Full K8s reference: `../shared/docs/KUBERNETES_SETUP_GUIDE.md`  
> Deploy standard: `../shared/docs/DEPLOY_STANDARD.md`
