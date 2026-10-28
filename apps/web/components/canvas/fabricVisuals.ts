export function getFabricColorAndShine(nameOrId: string = ''): { color: number; roughness: number; metalness: number } {
  const lower = nameOrId.toLowerCase();
  if (lower.includes('ivory') || lower.includes('duchesse') || lower.includes('slk-01') || lower.includes('slk-401')) {
    return { color: 0xf5f1e8, roughness: 0.26, metalness: 0.12 }; // Luminous Warm Ivory Duchesse Satin
  }
  if (lower.includes('velvet') || lower.includes('vlv')) {
    return { color: 0x1a1c22, roughness: 0.65, metalness: 0.08 }; // Deep Midnight Noir Velvet
  }
  if (lower.includes('wool') || lower.includes('crepe') || lower.includes('wol')) {
    return { color: 0x32343a, roughness: 0.58, metalness: 0.05 }; // Tailoring Charcoal Wool Crepe
  }
  if (lower.includes('emerald') || lower.includes('brocade')) {
    return { color: 0x1b4332, roughness: 0.32, metalness: 0.22 }; // Rich Emerald Silk Brocade
  }
  if (lower.includes('linen') || lower.includes('lin')) {
    return { color: 0xe6e0d5, roughness: 0.72, metalness: 0.02 }; // Natural Oatmeal Flax Linen
  }
  if (lower.includes('cashmere') || lower.includes('csh') || lower.includes('camel')) {
    return { color: 0xc49a6c, roughness: 0.68, metalness: 0.05 }; // Rich Camel Cashmere
  }
  return { color: 0xf2ede4, roughness: 0.32, metalness: 0.15 }; // Default luminous luxury textile
}

export function getFabricTextureUrl(nameOrId: string = ''): string | null {
  const lower = nameOrId.toLowerCase();
  if (lower.includes('slk-892') || lower.includes('silk-jacquard') || lower.includes('jacquard')) {
    return '/textures/fabrics/silk-jacquard.svg';
  }
  if (lower.includes('slk-401') || lower.includes('ivory-satin') || lower.includes('duchesse')) {
    return '/textures/fabrics/ivory-satin.svg';
  }
  if (lower.includes('wol-205') || lower.includes('charcoal-wool') || (lower.includes('wool') && lower.includes('crepe'))) {
    return '/textures/fabrics/charcoal-wool.svg';
  }
  if (lower.includes('vlv-730') || lower.includes('obsidian-velvet') || lower.includes('velvet')) {
    return '/textures/fabrics/obsidian-velvet.svg';
  }
  if (lower.includes('lin-112') || lower.includes('heritage-linen') || (lower.includes('flax') && lower.includes('linen'))) {
    return '/textures/fabrics/heritage-linen.svg';
  }
  if (lower.includes('brc-608') || lower.includes('venetian-brocade') || lower.includes('venetian')) {
    return '/textures/fabrics/venetian-brocade.svg';
  }
  if (lower.includes('slk-120') || lower.includes('champagne-cupro') || lower.includes('cupro')) {
    return '/textures/fabrics/champagne-cupro.svg';
  }
  if (lower.includes('wol-340') || lower.includes('wool-twill') || lower.includes('twill')) {
    return '/textures/fabrics/wool-twill.svg';
  }
  if (lower.includes('csh-502') || lower.includes('camel-cashmere') || lower.includes('cashmere') || lower.includes('camel')) {
    return '/textures/fabrics/camel-cashmere.svg';
  }
  if (lower.includes('chf-015') || lower.includes('silk-chiffon') || lower.includes('chiffon')) {
    return '/textures/fabrics/silk-chiffon.svg';
  }
  if (lower.includes('brc-905') || lower.includes('gold-brocade') || lower.includes('brocade')) {
    return '/textures/fabrics/gold-brocade.svg';
  }
  if (lower.includes('lin-404') || lower.includes('raw-linen') || lower.includes('linen')) {
    return '/textures/fabrics/raw-linen.svg';
  }
  return null;
}
