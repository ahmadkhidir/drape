# Contracts

One entry per interface. `Frozen` means both sides agree; `Implemented` means it shipped and
conforms. A change after `Frozen` is a `change-request` issue and a PR that updates both sides.
In code, schemas and types use semantic domain names, referencing `C-###` in docstrings.

### C-001: POST /api/v1/auth/login
**Status:** Frozen
**Auth:** Public (no token required)
**Request:**
  email: string (required, valid email format)
  password: string (required, min 8 characters)
**Response 200:**
  token: string (JWT bearer token)
  refreshToken: string (UUIDv4 refresh token)
  expiresIn: integer (session duration in seconds, e.g. 86400)
  user:
    id: string (UUIDv4)
    email: string (format: email)
    fullName: string
    phone: string | null
    role: "customer" | "atelier_pro" | "cutter" | "tailor" | "admin"
    mfaRequired: boolean
    createdAt: string (format: date-time)
**Errors:**
  400: { code: "VALIDATION_FAILED", message: "Request body failed validation.", fields: { [field: string]: string } }
  401: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." }
  403: { code: "ACCOUNT_SUSPENDED", message: "Account has been suspended. Please contact concierge support." }
  429: { code: "RATE_LIMITED", retryAfter: integer }

### C-002: POST /api/v1/auth/mfa/verify
**Status:** Frozen
**Auth:** Pre-MFA Session Bearer Token (issued when login requires elevation per NFR-020)
**Request:**
  ticket: string (required, single-use MFA session ticket)
  type: "totp" | "webauthn" (required)
  totpCode: string (optional, 6-digit numeric string, required if type is "totp")
  webauthnAssertion: object (optional, required if type is "webauthn")
    credentialId: string (required, base64url encoded credential identifier)
    authenticatorData: string (required, base64url encoded authenticator data)
    clientDataJSON: string (required, base64url encoded client data JSON)
    signature: string (required, base64url encoded cryptographic signature)
**Response 200:**
  token: string (elevated JWT bearer token with operational cutter/admin claims)
  refreshToken: string (UUIDv4 refresh token)
  user:
    id: string (UUIDv4)
    email: string (format: email)
    fullName: string
    role: "cutter" | "admin"
    mfaVerified: boolean
**Errors:**
  400: { code: "VALIDATION_FAILED", message: "Missing required MFA credentials.", fields: { [field: string]: string } }
  401: { code: "MFA_INVALID_CODE", message: "Invalid or expired MFA code or WebAuthn assertion." }
  403: { code: "MFA_TICKET_EXPIRED", message: "MFA session ticket has expired. Please log in again." }
  429: { code: "RATE_LIMITED", retryAfter: integer }

### C-003: POST /api/v1/auth/logout
**Status:** Frozen
**Auth:** Bearer token (required)
**Request:**
  refreshToken: string (required, UUIDv4 refresh token to revoke)
**Response 200:**
  success: boolean
  message: string (e.g. "Session successfully terminated.")
**Errors:**
  401: { code: "UNAUTHORIZED", message: "Invalid or expired authentication session." }

### C-004: POST /api/v1/consents/biometric
**Status:** Frozen
**Auth:** Bearer token or Guest Session Token
**Request:**
  regulationStandard: "BIPA_IL" | "GDPR_ART_9" | "CCPA_CPRA" | "CUBI_TX" (required)
  consentGranted: boolean (required, must be true for affirmative assent)
  noticeVersion: string (required, identifier of displayed privacy policy e.g. "2026.1-BIPA")
  userAgent: string (required, client browser and hardware identifier)
**Response 201:**
  consentRecord:
    id: string (UUIDv4)
    userId: string (UUIDv4 or guest session UUID)
    regulationStandard: "BIPA_IL" | "GDPR_ART_9" | "CCPA_CPRA" | "CUBI_TX"
    consentGranted: boolean
    grantedAt: string (format: date-time)
    expiresAt: string (format: date-time, maximum 365 days from grantedAt)
    consentToken: string (cryptographically signed HMAC-SHA256 token required for fitting endpoints)
**Errors:**
  400: { code: "AFFIRMATIVE_CONSENT_REQUIRED", message: "Biometric processing requires affirmative explicit consent (consentGranted must be true)." }
  401: { code: "UNAUTHORIZED", message: "Active user session or guest token required to record consent." }
  422: { code: "UNSUPPORTED_REGULATION", message: "Supplied regulatory framework standard is not recognized." }

### C-005: GET /api/v1/consents/biometric/active
**Status:** Frozen
**Auth:** Bearer token or Guest Session Token
**Request:**
  (None - session inferred from Authorization header or session cookie)
**Response 200:**
  hasActiveConsent: boolean
  consentRecord: object | null
    id: string (UUIDv4)
    regulationStandard: "BIPA_IL" | "GDPR_ART_9" | "CCPA_CPRA" | "CUBI_TX"
    grantedAt: string (format: date-time)
    expiresAt: string (format: date-time)
    consentToken: string
    remainingDays: integer
**Errors:**
  401: { code: "UNAUTHORIZED", message: "Authentication required." }

### C-006: DELETE /api/v1/consents/biometric/:id
**Status:** Frozen
**Auth:** Bearer token (required)
**Request:**
  confirmErasure: boolean (required, must be true to trigger irreversible cryptographic scrub)
**Response 200:**
  revoked: boolean
  revokedAt: string (format: date-time)
  erasureStatus: "COMPLETED"
  purgedRecords:
    biometricSignatures: integer
    ephemeralSessions: integer
    savedFittingsRetainedAnonymized: integer
  certificateUrl: string (format: uri, cryptographically signed audit certificate of data destruction)
**Errors:**
  400: { code: "CONFIRMATION_REQUIRED", message: "Explicit confirmation boolean required to execute biometric erasure." }
  401: { code: "UNAUTHORIZED", message: "Authentication required." }
  404: { code: "CONSENT_NOT_FOUND", message: "Biometric consent record not found or does not belong to user." }

### C-007: GET /api/v1/fabrics
**Status:** Frozen
**Auth:** Public (no token required)
**Request:**
  query: string (optional, search term e.g. "Emerald Silk Brocade", "black tie gown")
  fiber: "silk" | "wool" | "linen" | "cotton" | "blend" | "velvet" | "brocade" (optional)
  minGsm: number (optional, min grams per square meter, 30.0 to 900.0)
  maxGsm: number (optional, max grams per square meter, 30.0 to 900.0)
  weave: "twill" | "satin" | "jacquard" | "crepe" | "plain" | "brocade" | "chiffon" (optional)
  occasion: "black_tie" | "bridal" | "daywear" | "cocktail" | "suiting" (optional)
  minContinuousYards: number (optional, minimum unbroken yards in stock, default 0.125)
  sort: "featured" | "gsm_asc" | "gsm_desc" | "price_asc" | "price_desc" | "newest" (optional, default "featured")
  page: integer (optional, default 1, min 1)
  limit: integer (optional, default 12, min 1, max 48)
**Response 200:**
  items: array of object
    id: string (textile SKU e.g. "FAB-SLK-892")
    name: string (e.g. "Emerald Architectural Silk Brocade")
    millName: string
    countryOfOrigin: string (ISO 3166-1 alpha-2)
    fiberBreakdown: string (e.g. "85% Mulberry Silk, 15% Metallic Lurex")
    gsm: number
    widthInches: number
    drapeCoefficient: number (0.0=rigid, 1.0=liquid fluid)
    stiffnessRating: number (0.0 to 10.0)
    pricePerYard: number (USD)
    remainingContinuousYards: number (unbroken yards on active warehouse bolt)
    isLowStock: boolean (true when remainingContinuousYards < 5.0)
    thumbnailUrl: string (format: uri)
    normalMapUrl: string (format: uri)
  pagination:
    totalItems: integer
    totalPages: integer
    currentPage: integer
    limit: integer
  facets:
    fiberCounts: { [fiber: string]: integer }
    weaveCounts: { [weave: string]: integer }
    gsmRanges: { [range: string]: integer }
**Errors:**
  400: { code: "INVALID_FILTER_PARAMS", message: "Filter query parameter values out of acceptable bounds.", fields: { [field: string]: string } }
  503: { code: "SEARCH_INDEX_DEGRADED", message: "Search cluster degraded; serving fallback cached catalog." }

### C-008: GET /api/v1/fabrics/:id
**Status:** Frozen
**Auth:** Public (no token required)
**Request:**
  (Path parameter id: string, fabric SKU e.g. "FAB-SLK-892")
**Response 200:**
  id: string (textile SKU)
  name: string
  millName: string
  countryOfOrigin: string (ISO 3166-1 alpha-2)
  fiberBreakdown: string
  gsm: number
  widthInches: number
  drapeCoefficient: number (0.0 to 1.0)
  stiffnessRating: number (0.0 to 10.0)
  stretchPercentage: number (0.0 to 100.0)
  transparencyRating: number (0.0 to 1.0)
  pricePerYard: number (USD)
  swatchPrice: number (fixed 25.00 USD)
  pbrTexturesUrl: string (format: uri, PBR asset manifest endpoint)
  activeBolt:
    id: string (physical bolt identifier e.g. "bolt_901")
    dyeLotCode: string (e.g. "LOT-2026-EMR-04")
    remainingContinuousYards: number
    isLowStock: boolean
  careInstructions:
    ironTemperatureMaxC: number
    dryCleanOnly: boolean
    interliningRecommendation: string
  createdAt: string (format: date-time)
**Errors:**
  404: { code: "FABRIC_NOT_FOUND", message: "Fabric SKU not found in active atelier catalog." }

### C-009: GET /api/v1/fabrics/:id/shader-assets
**Status:** Frozen
**Auth:** Public (no token required)
**Request:**
  (Path parameter id: string, fabric SKU)
**Response 200:**
  fabricId: string
  wgslShaderUrl: string (format: uri, compiled WebGPU WGSL simulation shader)
  webglShaderUrl: string (format: uri, fallback WebGL 2.0 compute shader)
  loopingVideoFallbackUrl: string (format: uri, 60fps MP4 simulation fallback)
  physicsMatrix:
    massDensity: number (derived from fabric GSM)
    bendingStiffness: number
    tensileElasticity: number
    airDamping: number
    gravityVector: array of number (3 elements: [x, y, z])
  textures:
    albedoUrl: string (format: uri, 4K sRGB WebP)
    normalMapUrl: string (format: uri, 16-bit tangent-space normal map)
    roughnessMapUrl: string (format: uri, linear roughness map)
    metallicMapUrl: string (format: uri, linear metallic map)
    subsurfaceLutUrl: string (format: uri, subsurface scattering lookup texture)
  microWeaveTileBaseUrl: string (format: uri, base endpoint for pyramidal deep-zoom tiles)
  maxTileZoomLevel: integer (maximum tile level e.g. 5)
**Errors:**
  404: { code: "FABRIC_NOT_FOUND", message: "Fabric SKU not found." }
  502: { code: "CDN_ASSET_UNAVAILABLE", message: "Textile shader assets temporarily unreachable from Edge CDN." }

### C-010: GET /api/v1/fabrics/:id/micro-weave/tiles/:level/:x/:y
**Status:** Frozen
**Auth:** Public (no token required)
**Request:**
  (Path parameters id: string, level: integer (0 to 5), x: integer, y: integer)
**Response 200:**
  contentType: "image/webp"
  headers:
    Cache-Control: "public, max-age=31536000, immutable"
  binary: byte[] (256x256 WebP microscopic weave texture tile)
**Errors:**
  400: { code: "INVALID_TILE_COORDINATES", message: "Requested zoom level or tile coordinates are out of valid range." }
  404: { code: "TILE_NOT_FOUND", message: "Weave texture tile does not exist for this textile SKU." }

### C-011: POST /api/v1/fittings
**Status:** Frozen
**Auth:** Bearer token or Guest Session Token (Header `X-Biometric-Consent-Token` required if mode is "photo")
**Request:**
  fabricId: string (required, textile SKU e.g. "FAB-SLK-892")
  silhouetteId: string (required, preset ID e.g. "corseted_mermaid", "grecian_bias_gown", "architectural_tuxedo", "ballgown_offshoulder")
  mode: "photo" | "mannequin" (required)
  photo: binary (optional, JPEG/PNG/WebP, min 720x1280, max 15MB; required if mode is "photo")
  mannequinBodyType: "petite" | "athletic" | "curvy" | "tall" | "standard" (optional, required if mode is "mannequin")
  customPrompt: string (optional, max 500 characters natural language tailoring description)
  sketchImage: binary (optional, JPEG/PNG/WebP dressmaker sketch, max 10MB)
**Response 202:**
  jobId: string (UUIDv4)
  status: "queued"
  estimatedWaitSeconds: number (e.g. 3.8)
  queuePosition: integer
  websocketUrl: string (format: uri, WebSocket progress endpoint)
  ephemeralExpiresAt: string (format: date-time, maximum 15 minutes post-submission)
**Errors:**
  400: { code: "INVALID_SILHOUETTE_OR_FABRIC", message: "Specified silhouette or fabric SKU is invalid or incompatible." }
  403: { code: "BIOMETRIC_CONSENT_REQUIRED", message: "Photo upload requires valid affirmative biometric consent token per Illinois BIPA/GDPR." }
  413: { code: "PHOTO_PAYLOAD_TOO_LARGE", message: "Photo exceeds 15MB file size limit." }
  422: { code: "PHOTO_SAFETY_VIOLATION", message: "Uploaded image contains prohibited content or does not show an upright human figure." }
  422: { code: "PHOTO_OCCLUDED_OR_CROPPED", message: "Full body not visible. Please upload a clear photo including shoulders down to feet." }
  429: { code: "MONTHLY_FITTING_LIMIT_REACHED", message: "Free tier limit of 3 fittings per month reached. Upgrade to Atelier Client or Couture Studio Pro." }
  503: { code: "GPU_WORKER_POOL_EXHAUSTED", message: "Serverless GPU capacity full. Falling back to 3D parametric mannequin render." }

### C-012: GET /api/v1/fittings/:id
**Status:** Frozen
**Auth:** Bearer token or Guest Session Token (matching fitting session owner)
**Request:**
  (Path parameter id: string, fitting UUIDv4)
**Response 200:**
  id: string (UUIDv4)
  userId: string (UUIDv4)
  fabricId: string (textile SKU)
  silhouetteId: string
  status: "queued" | "processing" | "completed" | "failed"
  renderUrl: string | null (format: uri, high-resolution composite fitting render)
  motionVideoUrl: string | null (format: uri, 4-second looping MP4 if generated)
  isWatermarked: boolean (true for Guest Explorer tier)
  drapeScore: number (0.0 to 1.0 fit confidence rating)
  inferredMeasurements:
    estimatedHeightCm: number
    bustCircumferenceCm: number
    waistCircumferenceCm: number
    hipCircumferenceCm: number
  fallbackUsed: boolean (true if 3D parametric mannequin substituted due to cluster load or photo occlusion)
  fallbackReason: string | null
  ephemeralExpiresAt: string (format: date-time)
  createdAt: string (format: date-time)
**Errors:**
  401: { code: "UNAUTHORIZED", message: "Authentication required." }
  403: { code: "FORBIDDEN", message: "Fitting does not belong to the current authenticated session." }
  404: { code: "FITTING_NOT_FOUND", message: "Fitting session ID not found or ephemeral lifetime expired." }
  410: { code: "FITTING_EPHEMERAL_EXPIRED", message: "Customer portrait assets have been cryptographically purged per privacy lifecycle." }

### C-013: WS /ws/v1/fittings/:id
**Status:** Frozen
**Auth:** Bearer token or Query ticket parameter `?ticket=ticket_token`
**Request:**
  (Client initiates WebSocket connection upgrade)
**Response 101:**
  (WebSocket Connection Established)
**Server Push Events:**
  Event: "FITTING_STATUS_UPDATE"
    jobId: string
    status: "QUEUED" | "SEGMENTING_POSE" | "DRAPING_CLOTH" | "SYNTHESIZING_TEXTURES" | "COMPOSITING"
    progressPercent: integer (0 to 100)
    message: string (e.g. "Draping silk fibers to body geometry...")
  Event: "FITTING_COMPLETED"
    jobId: string
    status: "COMPLETED"
    renderUrl: string (format: uri)
    drapeScore: number
    isWatermarked: boolean
    ephemeralExpiresAt: string (format: date-time)
  Event: "FITTING_FAILED"
    jobId: string
    status: "FAILED"
    errorCode: "INFERENCE_TIMEOUT" | "OCCLUSION_ERROR" | "GPU_ERROR"
    errorMessage: string
    fallbackRenderUrl: string (format: uri, 3D parametric mannequin fallback)
**Client Messages:**
  Event: "PING"
    timestamp: integer (epoch milliseconds)
**Errors:**
  4401: { code: "WS_UNAUTHORIZED", message: "Missing or invalid ticket." }
  4404: { code: "WS_FITTING_NOT_FOUND", message: "Fitting job not found." }
  4408: { code: "WS_INFERENCE_TIMEOUT", message: "Fitting inference exceeded 8.0s timeout." }

### C-014: POST /api/v1/fittings/:id/motion
**Status:** Frozen
**Auth:** Bearer token (Atelier Client or Couture Studio Pro tier required)
**Request:**
  trajectoryPreset: "turntable_360" | "runway_step_turn" (required, default "turntable_360")
  fps: integer (required, fixed 30)
  durationMs: integer (required, fixed 4000)
**Response 202:**
  motionJobId: string (UUIDv4)
  fittingId: string (UUIDv4)
  status: "queued"
  estimatedWaitSeconds: number (e.g. 5.5)
  queuePosition: integer
**Errors:**
  401: { code: "UNAUTHORIZED", message: "Authentication required." }
  402: { code: "TIER_RESTRICTION", message: "360-degree looping motion video walk requires Atelier Client or Couture Studio Pro subscription." }
  404: { code: "FITTING_NOT_FOUND", message: "Base fitting render not found." }
  409: { code: "FITTING_NOT_READY", message: "Cannot generate motion video while base static fitting is still processing." }
  503: { code: "VIDEO_QUEUE_FULL", message: "Video generation workers at maximum capacity; please try again shortly." }

### C-015: GET /api/v1/fittings/:id/motion
**Status:** Frozen
**Auth:** Bearer token or Guest Session Token
**Request:**
  (Path parameter id: string, fitting UUIDv4)
**Response 200:**
  motionJobId: string (UUIDv4)
  fittingId: string (UUIDv4)
  status: "queued" | "rendering" | "completed" | "failed"
  videoUrl: string | null (format: uri, 1080x1920 30FPS MP4/WebM)
  durationMs: integer (4000)
  fps: integer (30)
  thumbnailSpriteUrl: string | null (format: uri, horizontal scrub sprite sheet for mobile scrubbing)
  createdAt: string (format: date-time)
**Errors:**
  401: { code: "UNAUTHORIZED", message: "Authentication required." }
  404: { code: "MOTION_JOB_NOT_FOUND", message: "No motion video request found for this fitting." }

### C-016: POST /api/v1/yardage/calculate
**Status:** Frozen
**Auth:** Public (no token required)
**Request:**
  silhouetteId: string (required, curated preset or custom pattern block)
  fabricId: string (required, textile SKU e.g. "FAB-SLK-892")
  heightCm: number (required, 120.0 to 220.0)
  bustCircumferenceCm: number (optional, 60.0 to 180.0)
  waistCircumferenceCm: number (optional, 50.0 to 160.0)
  hipCircumferenceCm: number (optional, 70.0 to 190.0)
  customTrainLengthInches: number (optional, 0.0 to 72.0)
  standardSize: "US_0" | "US_2" | "US_4" | "US_6" | "US_8" | "US_10" | "US_12" | "US_14" | "US_16" | "US_18" | "US_20" | "US_22" | "US_24" (optional fallback when custom dimensions omitted)
**Response 200:**
  recommendedYards: number (rounded to nearest 0.125 yard, e.g. 4.25)
  recommendedMeters: number (e.g. 3.88)
  safetyMarginYards: number (e.g. 0.375)
  boltWidthInches: number (e.g. 54.0)
  activeBoltId: string (physical bolt identifier e.g. "bolt_901")
  remainingContinuousYardsOnBolt: number
  isSplitBoltWarning: boolean (true if recommendedYards > remainingContinuousYardsOnBolt)
  isDirectionalNap: boolean (true if fabric weave requires one-way cut orientation)
  cuttingLayout:
    panels: array of object
      name: string (e.g. "Front Bodice", "Back Bodice", "Mermaid Skirt Flare", "Sleeves")
      lengthYards: number
      widthInches: number
      grainlineAngleDegrees: number (0.0 for straight grain, 45.0 for bias)
    diagramSvgUrl: string (format: uri, vector cutting marker layout visualization)
  estimatedTotalPrice: number (USD)
**Errors:**
  400: { code: "VALIDATION_FAILED", message: "Measurements or dimensions outside acceptable physiological ranges.", fields: { [field: string]: string } }
  404: { code: "FABRIC_OR_SILHOUETTE_NOT_FOUND", message: "Specified fabric SKU or silhouette block not found." }

### C-017: GET /api/v1/fittings/:id/tailor-spec/pdf
**Status:** Frozen
**Auth:** Bearer token or Guest Session Token
**Request:**
  (Path parameter id: string, fitting UUIDv4; Query parameter orderId: string optional)
**Response 200:**
  contentType: "application/pdf"
  headers:
    Content-Disposition: "attachment; filename=\"Drape-Tailor-Spec.pdf\""
  binary: byte[] (High-resolution vector PDF tailor technical dossier)
**Errors:**
  401: { code: "UNAUTHORIZED", message: "Authentication required." }
  403: { code: "FORBIDDEN", message: "Access denied to requested tailor specification dossier." }
  404: { code: "SPEC_NOT_FOUND", message: "Fitting or order specification not found." }
  500: { code: "PDF_COMPILATION_ERROR", message: "Vector PDF compilation failed; retry in progress." }

### C-018: GET /api/v1/specs/public/:specToken
**Status:** Frozen
**Auth:** Public (authenticated via secure, single-use cryptographic token in URL)
**Request:**
  (Path parameter specToken: string)
**Response 200:**
  specId: string
  orderNumber: string
  customerFirstName: string
  silhouetteName: string
  fabric:
    sku: string
    name: string
    millName: string
    countryOfOrigin: string
    fiberBreakdown: string
    gsm: number
    widthInches: number
    dyeLotCode: string
  yardageOrdered: number
  fittingRenderUrl: string (format: uri)
  grainlineCuttingDiagramUrl: string (format: uri)
  technicalNotes:
    pressingTemperatureC: number
    steamPermitted: boolean
    interliningType: string
    needleSizeRecommendation: string
  expiresAt: string (format: date-time)
**Errors:**
  404: { code: "SPEC_TOKEN_NOT_FOUND", message: "Technical spec link is invalid or has expired." }

### C-019: POST /api/v1/checkout/bolt-lock
**Status:** Frozen
**Auth:** Bearer token or Guest Session Token
**Request:**
  boltId: string (required, physical roll identifier e.g. "bolt_901")
  requestedYards: number (required, min 0.125, multiple of 0.125)
**Response 200:**
  lockId: string (UUIDv4)
  boltId: string
  fabricId: string
  lockedYards: number
  lockAcquiredAt: string (format: date-time)
  expiresAt: string (format: date-time, 15-minute TTL from acquisition)
  remainingUnallocatedYards: number
**Errors:**
  400: { code: "INVALID_YARDAGE_INCREMENT", message: "Yardage must be positive and in 1/8th yard (0.125) increments." }
  404: { code: "BOLT_NOT_FOUND", message: "Warehouse bolt not found or inactive." }
  409: { code: "INSUFFICIENT_CONTINUOUS_YARDAGE", message: "Bolt does not have sufficient continuous unreserved yardage for this cut.", availableYards: number, requestedYards: number }
  423: { code: "BOLT_CONCURRENTLY_LOCKED", message: "Another patron is currently holding a reservation on this bolt. Please retry in a few moments." }

### C-020: DELETE /api/v1/checkout/bolt-lock/:boltId
**Status:** Frozen
**Auth:** Bearer token or Guest Session Token
**Request:**
  lockId: string (required, lock token returned when lock was acquired)
**Response 200:**
  released: boolean
  boltId: string
  message: string (e.g. "Bolt inventory reservation successfully released.")
**Errors:**
  403: { code: "LOCK_OWNERSHIP_MISMATCH", message: "Cannot release lock owned by another session." }
  404: { code: "LOCK_NOT_FOUND", message: "Active lock not found or already expired." }

### C-021: POST /api/v1/checkout/create-intent
**Status:** Frozen
**Auth:** Bearer token or Guest Session Token
**Request:**
  currency: "USD" | "EUR" | "GBP" | "NGN" (required, ISO 4217)
  items: array of object (required, min 1 item)
    fabricId: string (required, textile SKU)
    boltId: string (required if isSwatchBox is false)
    yardsCut: number (required if isSwatchBox is false, min 0.125, increment 0.125)
    isSwatchBox: boolean (required)
    lockId: string (required if isSwatchBox is false)
  applySwatchCredit: boolean (optional, default true)
**Response 200:**
  clientSecret: string (Stripe PaymentIntent client secret)
  paymentIntentId: string (Stripe payment identifier)
  subtotalAmount: number
  swatchCreditApplied: number (e.g. 25.00 if qualifying prior swatch box verified)
  shippingAmount: number
  taxAmount: number
  totalAmount: number
  currency: "USD" | "EUR" | "GBP" | "NGN"
  expiresAt: string (format: date-time, matching shortest active bolt lock expiry)
**Errors:**
  400: { code: "CART_VALIDATION_FAILED", message: "Cart items contain invalid configurations.", fields: { [field: string]: string } }
  409: { code: "BOLT_LOCK_EXPIRED", message: "One or more 15-minute bolt reservations have expired. Please re-lock your yardage." }
  502: { code: "PAYMENT_GATEWAY_ERROR", message: "Stripe PaymentIntent creation failed; inventory lock preserved." }

### C-022: POST /api/v1/checkout/orders
**Status:** Frozen
**Auth:** Bearer token or Guest Session Token
**Request:**
  idempotencyKey: string (required, UUIDv4)
  paymentIntentId: string (required, authorized Stripe PaymentIntent ID)
  items: array of object (required)
    fabricId: string (required)
    boltId: string (required if isSwatchBox is false)
    lockId: string (required if isSwatchBox is false)
    yardsCut: number (required, min 0.125)
    isSwatchBox: boolean (required)
    fittingId: string | null (optional reference to customer fitting)
  acknowledgedNonReturnableCut: boolean (required, must be true per FEAT-008 legal disclaimer)
  shippingAddress:
    street: string (required)
    city: string (required)
    postalCode: string (required)
    country: string (required, ISO 3166-1 alpha-2)
  recipientContact:
    fullName: string (required)
    email: string (required, format: email)
    phone: string (required)
  tailorRouting: object | null (optional concierge tailor routing)
    tailorStudioId: string (required if tailorRouting present, UUIDv4)
    conciergeNotes: string (optional)
**Response 201:**
  order:
    id: string (UUIDv4)
    orderNumber: string (e.g. "DRP-2027-442")
    status: "confirmed"
    totalAmount: number
    currency: "USD" | "EUR" | "GBP" | "NGN"
    paymentChargeId: string
    items: array of object
      id: string (UUIDv4)
      fabricId: string
      boltRollId: string
      dyeLotCode: string
      yardsCut: number
      unitPrice: number
      isSwatchBox: boolean
    tailorDispatch: object | null
      dispatchId: string (UUIDv4)
      tailorStudioId: string
      status: "dispatched" | "received_at_atelier"
    specDossierUrl: string (format: uri)
    createdAt: string (format: date-time)
**Errors:**
  400: { code: "DISCLAIMER_NOT_ACKNOWLEDGED", message: "Mandatory acknowledgment that custom-cut yardage is non-returnable required." }
  402: { code: "PAYMENT_NOT_AUTHORIZED", message: "Stripe payment intent has not been confirmed or funds capture failed." }
  409: { code: "IDEMPOTENT_SUBMISSION_EXISTS", message: "Order with this idempotency key already processed.", existingOrderId: string }
  409: { code: "BOLT_LOCK_EXPIRED", message: "Bolt reservation expired before order finalization." }
  422: { code: "SHIPPING_ADDRESS_INVALID", message: "Delivery address validation failed." }

### C-023: GET /api/v1/orders/:id
**Status:** Frozen
**Auth:** Bearer token or Guest Email Query parameter `?email=customer_email`
**Request:**
  (Path parameter id: string, order UUIDv4)
**Response 200:**
  id: string (UUIDv4)
  orderNumber: string (e.g. "DRP-2027-442")
  userId: string
  status: "pending" | "confirmed" | "cutting" | "dispatched" | "delivered" | "cancelled"
  totalAmount: number
  currency: "USD" | "EUR" | "GBP" | "NGN"
  items: array of object
    id: string
    fabricId: string
    fabricName: string
    boltRollId: string
    dyeLotCode: string
    yardsCut: number
    unitPrice: number
    isSwatchBox: boolean
  shippingAddress:
    street: string
    city: string
    postalCode: string
    country: string
  carrierTracking:
    carrier: "DHL_EXPRESS" | "FEDEX" | null
    trackingNumber: string | null
    trackingUrl: string | null
  dyeLotCertificateUrl: string (format: uri)
  specDossierUrl: string (format: uri)
  tailorDispatch: object | null
    studioName: string
    masterCutter: string
    city: string
    status: string
  createdAt: string (format: date-time)
**Errors:**
  401: { code: "UNAUTHORIZED", message: "Authentication or verification email required." }
  403: { code: "FORBIDDEN", message: "Order does not belong to this account or email does not match." }
  404: { code: "ORDER_NOT_FOUND", message: "Order record not found." }

### C-024: POST /api/v1/webhooks/stripe
**Status:** Frozen
**Auth:** Public (verified via cryptographic `Stripe-Signature` HMAC header)
**Request:**
  id: string (Stripe event ID e.g. "evt_12345")
  type: "payment_intent.succeeded" | "payment_intent.payment_failed" | "charge.dispute.created"
  data:
    object: object (Stripe payload object)
**Response 200:**
  received: boolean
**Errors:**
  400: { code: "WEBHOOK_SIGNATURE_INVALID", message: "Stripe signature verification failed." }
  500: { code: "WEBHOOK_PROCESSING_FAILED", message: "Database transaction failure handling event." }

### C-025: GET /api/v1/tailors
**Status:** Frozen
**Auth:** Public (no token required)
**Request:**
  city: "London" | "New_York" | "Paris" | "Milan" | "Lagos" (optional)
  specialty: "bridal" | "suiting" | "corsetry" | "traditional" (optional)
  maxTurnaroundWeeks: integer (optional, 2 to 8)
  acceptingCommissions: boolean (optional, default true)
  page: integer (optional, default 1)
  limit: integer (optional, default 10)
**Response 200:**
  items: array of object
    id: string (UUIDv4)
    studioName: string (e.g. "Atelier Savile New York")
    masterCutter: string
    city: string
    address: string
    specialties: array of string
    rating: number (1.0 to 5.0)
    reviewCount: integer
    turnaroundWeeks: integer
    activeCapacity: boolean
    leadTimeDays: integer
    portfolioImages: array of string (format: uri)
    guildBadge: string | null (e.g. "Savile Row Bespoke Association")
  pagination:
    totalItems: integer
    totalPages: integer
    currentPage: integer
**Errors:**
  400: { code: "INVALID_QUERY_PARAMS", message: "Invalid filter parameters provided." }

### C-026: GET /api/v1/tailors/:id
**Status:** Frozen
**Auth:** Public (no token required)
**Request:**
  (Path parameter id: string, tailor studio UUIDv4)
**Response 200:**
  id: string (UUIDv4)
  studioName: string
  masterCutter: string
  bio: string
  city: string
  address: string
  contactEmail: string (format: email)
  phone: string
  specialties: array of string
  rating: number (1.0 to 5.0)
  reviewCount: integer
  turnaroundWeeks: integer
  activeCapacity: boolean
  averageLaborCostUSD: number
  portfolioImages: array of string (format: uri)
  verifiedReviews: array of object
    authorName: string
    rating: number
    comment: string
    createdAt: string (format: date-time)
  createdAt: string (format: date-time)
**Errors:**
  404: { code: "TAILOR_STUDIO_NOT_FOUND", message: "Atelier studio profile not found." }

### C-027: POST /api/v1/orders/:id/route-tailor
**Status:** Frozen
**Auth:** Bearer token (Order owner or Admin)
**Request:**
  tailorStudioId: string (required, UUIDv4 of accredited studio)
  consultationDatePreferred: string (optional, format: date)
  specialInstructions: string (optional, max 1000 characters)
**Response 200:**
  dispatchRecord:
    id: string (UUIDv4)
    orderId: string (UUIDv4)
    tailorStudioId: string (UUIDv4)
    studioName: string
    status: "dispatched"
    digitalSpecUrl: string (format: uri)
    carrierTrackingNumber: string | null
    dispatchedAt: string (format: date-time)
  bookingConfirmation:
    consultationCalendarUrl: string (format: uri)
    estimatedAtelierArrivalDate: string (format: date)
**Errors:**
  400: { code: "ORDER_NOT_ROUTABLE", message: "Order is already dispatched to customer address or has been cancelled." }
  404: { code: "ORDER_OR_TAILOR_NOT_FOUND", message: "Order or Tailor Studio ID not found." }
  409: { code: "TAILOR_AT_CAPACITY", message: "Selected studio has temporarily paused new commissions. Please select an alternate atelier.", waitlistEstimatedDate: string }

### C-028: GET /api/v1/wardrobe
**Status:** Frozen
**Auth:** Bearer token (required)
**Request:**
  tab: "fittings" | "orders" | "all" (optional, default "all")
  page: integer (optional, default 1)
  limit: integer (optional, default 12)
**Response 200:**
  savedFittings: array of object
    id: string (UUIDv4)
    fabricId: string (textile SKU)
    fabricName: string
    silhouetteId: string
    silhouetteName: string
    renderUrl: string (format: uri)
    hasMotionVideo: boolean
    motionVideoUrl: string | null
    drapeScore: number
    createdAt: string (format: date-time)
  orders: array of object
    id: string (UUIDv4)
    orderNumber: string (e.g. "DRP-2027-442")
    status: "confirmed" | "cutting" | "dispatched" | "delivered"
    fabricName: string
    yardsCut: number
    totalAmount: number
    specPdfUrl: string (format: uri)
    carrierTrackingUrl: string | null
    createdAt: string (format: date-time)
**Errors:**
  401: { code: "UNAUTHORIZED", message: "Authentication required to access digital wardrobe." }

### C-029: POST /api/v1/wardrobe/lookup-guest
**Status:** Frozen
**Auth:** Public (no token required)
**Request:**
  orderNumber: string (required, e.g. "DRP-2027-442")
  billingEmail: string (required, format: email)
**Response 200:**
  oneTimeAccessToken: string (scoped JWT token valid for 2 hours for this order's assets)
  order:
    id: string (UUIDv4)
    orderNumber: string
    status: string
    fabricName: string
    yardsCut: number
    specPdfUrl: string (format: uri)
    carrierTrackingUrl: string | null
**Errors:**
  400: { code: "VALIDATION_FAILED", message: "Invalid order number or email format." }
  404: { code: "ORDER_LOOKUP_FAILED", message: "No matching order found for provided order number and billing email combination." }

### C-030: GET /api/v1/ops/cutting-queue
**Status:** Frozen
**Auth:** Bearer token (Role: "cutter" | "admin" with verified MFA)
**Request:**
  tableId: string (optional, e.g. "Table_02")
  status: "pending" | "in_progress" | "completed" (optional, default "pending")
  priority: "bridal_urgent" | "standard" | "all" (optional, default "all")
  limit: integer (optional, default 20)
**Response 200:**
  tableId: string
  pendingCount: integer
  urgentBridalCount: integer
  dispatchedTodayCount: integer
  queue: array of object
    orderId: string (UUIDv4)
    orderNumber: string (e.g. "DRP-2027-442")
    priority: "bridal_urgent" | "standard"
    deadlineUtc: string (format: date-time)
    fabricSku: string
    fabricName: string
    requiredContinuousYards: number
    requiredContinuousMeters: number
    activeBoltId: string
    dyeLotCode: string
    warehouseLocation: string (rack and bin coordinate e.g. "RACK-B-04")
    destinationType: "CUSTOMER" | "PARTNER_TAILOR"
    recipientName: string
    status: "pending" | "scanning" | "cutting"
**Errors:**
  401: { code: "UNAUTHORIZED", message: "Authentication required." }
  403: { code: "MFA_ELEVATION_REQUIRED", message: "Cutting room operations require active multi-factor authentication elevation." }

### C-031: GET /api/v1/ops/cutting-ticket/:id
**Status:** Frozen
**Auth:** Bearer token (Role: "cutter" | "admin" with verified MFA)
**Request:**
  (Path parameter id: string, order UUIDv4)
**Response 200:**
  orderId: string (UUIDv4)
  orderNumber: string (e.g. "DRP-2027-442")
  targetContinuousYards: number (e.g. 4.25)
  targetContinuousMeters: number (e.g. 3.88)
  expectedBolt:
    barcode: string (e.g. "bolt_901")
    fabricSku: string
    fabricName: string
    dyeLotCode: string
    remainingContinuousYards: number
    warehouseLocation: string
    widthInches: number
    gsm: number
  laserProjection:
    cutLineOffsetInches: number
    grainlineGridAngleDegrees: number
    svgProjectionMapUrl: string (format: uri, hardware laser projector vector overlay)
  hardwareStatus:
    barcodeVerified: boolean
    laserGuideActive: boolean
**Errors:**
  401: { code: "UNAUTHORIZED", message: "Authentication required." }
  403: { code: "FORBIDDEN", message: "Insufficient permissions for cutting room operations." }
  404: { code: "TICKET_NOT_FOUND", message: "Cutting work ticket not found." }

### C-032: POST /api/v1/ops/cutting-ticket/:id/verify-barcode
**Status:** Frozen
**Auth:** Bearer token (Role: "cutter" | "admin")
**Request:**
  scannedBarcode: string (required, physical barcode read from bolt roll label)
  tableId: string (required, e.g. "Table_02")
  manualOverridePin: string (optional, 4-digit supervisor PIN required if manual barcode override used)
**Response 200:**
  verified: boolean
  boltId: string
  dyeLotCode: string
  laserProjectionReady: boolean
  message: string (e.g. "Bolt verified. Laser guidance calibrated.")
**Errors:**
  400: { code: "MANUAL_PIN_INVALID", message: "Invalid supervisor PIN for manual barcode entry override." }
  404: { code: "BOLT_NOT_FOUND", message: "Scanned barcode not recognized in active warehouse inventory." }
  409: { code: "BOLT_MISMATCH_ALARM", message: "CRITICAL: Scanned bolt does not match specified order bolt! Halting cutting sequence.", expectedBoltId: string, scannedBoltId: string }

### C-033: POST /api/v1/ops/cutting-ticket/:id/complete
**Status:** Frozen
**Auth:** Bearer token (Role: "cutter" | "admin")
**Request:**
  actualCutYards: number (required, verified linear measurement to 0.125 yd precision)
  tableId: string (required)
  packagingInspectionPassed: boolean (required, must be true)
  packageType: "ARCHIVAL_CEDAR_BOX" | "SWATCH_PRESENTATION_BOX" (required)
**Response 200:**
  orderId: string (UUIDv4)
  status: "dispatched"
  boltRoll:
    id: string
    updatedRemainingContinuousYards: number
  carrierShippingLabelUrl: string (format: uri, 4x6 thermal shipping label PDF)
  carrierTrackingNumber: string
  dyeLotCertificatePdfUrl: string (format: uri, printed certificate included in physical box)
  dispatchedAt: string (format: date-time)
**Errors:**
  400: { code: "PACKAGING_INSPECTION_REQUIRED", message: "Archival packaging quality check must be certified." }
  409: { code: "BOLT_ALREADY_CUT", message: "Order ticket is already marked complete." }
  422: { code: "CUT_MEASUREMENT_DISCREPANCY", message: "Actual cut yards deviates from order specification by more than 0.125 yards." }

### C-034: POST /api/v1/ops/bolts/:id/quarantine
**Status:** Frozen
**Auth:** Bearer token (Role: "cutter" | "admin")
**Request:**
  orderId: string (required, active order affected by defect)
  flawType: "SNAG" | "SPOT_STAIN" | "WEAVE_IRREGULARITY" | "WIDTH_NARROWING" | "SHADING_VARIATION" (required)
  linearYardsFromStart: number (required, location of defect on roll)
  photoAttachmentUrl: string (optional, format: uri)
  cutterNotes: string (required, min 10 characters description)
**Response 200:**
  quarantinedBoltId: string
  boltStatus: "quarantined"
  orderStatus: "reallocated"
  sisterBoltAllocated:
    id: string
    dyeLotCode: string (identical dye lot certified)
    remainingContinuousYards: number
    warehouseLocation: string
  message: string (e.g. "Roll quarantined. Sister bolt allocated from same certified dye lot.")
**Errors:**
  404: { code: "BOLT_NOT_FOUND", message: "Bolt ID not found." }
  409: { code: "NO_SISTER_BOLT_AVAILABLE", message: "No continuous sister roll found with matching dye lot code. Escalate to Purchasing Lead.", dyeLotCode: string }

### C-035: WS /ws/v1/ops/cutting-room
**Status:** Frozen
**Auth:** Bearer token (Role: "cutter" | "admin") in connection query parameter `?token=jwt_token`
**Request:**
  (Client initiates WebSocket connection upgrade)
**Response 101:**
  (WebSocket Connection Established)
**Server Push Events:**
  Event: "QUEUE_ITEM_ADDED"
    orderId: string
    orderNumber: string
    priority: "bridal_urgent" | "standard"
    fabricSku: string
    requiredYards: number
  Event: "QUEUE_ITEM_UPDATED"
    orderId: string
    status: "scanning" | "cutting" | "dispatched"
  Event: "EMERGENCY_FLAW_BROADCAST"
    boltId: string
    fabricSku: string
    alertMessage: string
**Client Messages:**
  Event: "TABLE_HEARTBEAT"
    tableId: string
    cutterId: string
    timestamp: integer (epoch milliseconds)
**Errors:**
  4401: { code: "WS_UNAUTHORIZED", message: "Missing or invalid operational token." }
  4403: { code: "WS_FORBIDDEN", message: "Cutter role and MFA elevation required." }

### C-036: POST /api/v1/dye-lab/recolor-rescale
**Status:** Frozen
**Auth:** Bearer token (Role: "atelier_pro" | "admin")
**Request:**
  basePatternUrl: string (required, format: uri, SVG/TIFF/PNG base pattern)
  scaleFactor: number (required, 0.25 to 4.0)
  paletteHexes: array of string (optional, 2 to 8 hex color strings e.g. ["#800020", "#556B2F"])
  naturalLanguagePrompt: string (optional, e.g. "shift palette to Venetian rust, olive, and ochre")
  baseSubstrateSku: string (required, e.g. "SUB-SLK-HAB-100", "SUB-ORG-LIN-220")
**Response 200:**
  previewTextureUrl: string (format: uri, sRGB texture for WebGPU cloth simulation)
  printReadyTiffUrl: string (format: uri, 300 DPI CMYK TIFF for reactive digital textile printing)
  colorMatchDeltaE: number (confidence metric, DeltaE < 1.5)
  gamutAdjusted: boolean (true if one or more requested colors were snapped to reactive dye gamut)
  gamutAlerts: array of string (description of snapped colors if gamutAdjusted is true)
  estimatedCostPerYardUSD: number
**Errors:**
  400: { code: "INVALID_SCALE_OR_PALETTE", message: "Scale factor or color hex array invalid.", fields: { [field: string]: string } }
  402: { code: "PRO_SUBSCRIPTION_REQUIRED", message: "Generative Dye-Lab access requires Couture Studio Pro subscription." }
  422: { code: "GAMUT_EXTREME_OUT_OF_BOUNDS", message: "Requested colors cannot be safely synthesized using reactive dyes on chosen natural substrate." }

### C-037: AMQP neural.drape.generate
**Status:** Frozen
**Auth:** Internal Service-to-Service (TLS & IAM message queue credentials)
**Request:**
  jobId: string (UUIDv4)
  userId: string (UUIDv4)
  mode: "photo" | "mannequin"
  photoEphemeralRamPath: string | null (path on encrypted RAM-disk)
  mannequinPreset: string | null
  fabricSku: string
  gsm: number
  stiffnessRating: number
  drapeCoefficient: number
  silhouetteId: string
  customPrompt: string | null
  sketchUrl: string | null
  pbrTextures:
    albedoUrl: string
    normalMapUrl: string
    roughnessMapUrl: string
  timeoutSeconds: integer (fixed 8s timeout before fallback)
**Response 200:**
  jobId: string (UUIDv4)
  status: "COMPLETED"
  renderUrl: string (format: uri)
  drapeConfidenceScore: number (0.0 to 1.0)
  inferredMeasurements:
    heightCm: number
    bustCm: number
    waistCm: number
    hipCm: number
  ephemeralPhotoPurged: boolean (true certifying cryptographic wipe of raw photo)
  inferenceTimeMs: integer
**Errors:**
  jobId: string (UUIDv4)
  status: "FAILED"
  errorCode: "SAFETY_FILTER_REJECTED" | "POSE_ESTIMATION_FAILED" | "TIMEOUT_EXCEEDED" | "GPU_OUT_OF_MEMORY"
  errorMessage: string
  fallbackMannequinRenderUrl: string (format: uri, pre-rendered parametric render)

### C-038: AMQP neural.motion.generate
**Status:** Frozen
**Auth:** Internal Service-to-Service (TLS & IAM message queue credentials)
**Request:**
  motionJobId: string (UUIDv4)
  fittingId: string (UUIDv4)
  staticRenderUrl: string (format: uri)
  fabricSku: string
  gsm: number
  bendingModulus: number
  trajectoryPreset: "turntable_360" | "runway_step_turn"
  fps: integer (fixed 30)
  durationMs: integer (fixed 4000)
**Response 200:**
  motionJobId: string (UUIDv4)
  fittingId: string (UUIDv4)
  status: "COMPLETED"
  videoUrl: string (format: uri)
  durationMs: integer (4000)
  fps: integer (30)
  thumbnailSpriteUrl: string (format: uri)
  renderTimeMs: integer
**Errors:**
  motionJobId: string (UUIDv4)
  status: "FAILED"
  errorCode: "TEMPORAL_COHERENCE_FAILURE" | "GPU_WORKER_TIMEOUT"
  errorMessage: string

### C-039: gRPC YardageService.CalculateLayout
**Status:** Frozen
**Auth:** Internal Service-to-Service (mTLS)
**Request:**
  silhouette_id: string (required)
  fabric_sku: string (required)
  bolt_width_inches: double (required)
  is_directional_nap: bool (required)
  customer_height_cm: double (required)
  bust_cm: double (optional)
  waist_cm: double (optional)
  hip_cm: double (optional)
  train_length_inches: double (optional)
  safety_margin_factor: double (optional, default 0.08)
**Response 200:**
  recommended_yards: double
  recommended_meters: double
  safety_margin_yards: double
  panels: repeated GarmentPanelProto
    name: string
    length_yards: double
    width_inches: double
    grainline_angle_degrees: double
  diagram_svg_blob: bytes
  calculation_time_ms: int64
**Errors:**
  3: { code: "INVALID_ARGUMENT", message: "Measurements out of valid anatomical bounds." }
  5: { code: "NOT_FOUND", message: "Pattern block or fabric specifications not found." }
  4: { code: "DEADLINE_EXCEEDED", message: "Pattern nesting solver exceeded calculation latency budget." }
