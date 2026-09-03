# Domain Model

## Agence

```text
Tenant
└── Agency
    ├── AgencyProfile
    ├── Brand
    ├── GoogleLocation
    ├── GoogleReview[]
    ├── Campaign[]
    ├── AgencySite
    │   └── Page[]
    │       └── Section[]
    └── MediaAsset[]
```

## Voyage

```text
Country
└── Region
    └── Destination
        ├── City[]
        ├── Airport[]
        ├── Hotel[]
        ├── Circuit[]
        └── Offer[]
```

## Marketing

```text
Campaign
├── Asset[]
├── Publication[]
├── LandingPage[]
├── GooglePost[]
├── Newsletter[]
└── SocialPost[]
```
