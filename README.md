dev-env:

```bash
firebase use dev
```

prod-env:

```bash
firebase use prod
```

Verifying the current configuration using:

```bash
firebase functions:config:get
```

Set the configuration values for the environment:
dev-env:

```bash
firebase functions:config:set environment.prod=false
```

prod-env:

```bash
firebase functions:config:set environment.prod=true
```
