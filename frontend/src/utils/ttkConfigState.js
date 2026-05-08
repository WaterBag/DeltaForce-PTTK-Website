export const TTK_CONFIG_COLORS = [
  '#2F6F73', '#7A6FBE', '#C17C3A', '#4F7F52', '#8A5A68', '#587A9C',
  '#B7791F', '#3E6B45', '#9A6A5B', '#536F8F', '#8B7A3D', '#6F5C86',
  '#2D7B8A', '#A45F3D', '#5F7863', '#9B5C7A', '#6E7F3F', '#4D6674',
  '#8E7047', '#3D7469', '#7C675E', '#5E6FA3', '#A06565', '#6F8248',
];

export function getNextConfigId(configs = []) {
  return (configs.length ? Math.max(...configs.map((cfg) => Number(cfg.id) || 0)) : 0) + 1;
}

export function getConfigColor(config, fallbackIndex = 0) {
  return config?.color || TTK_CONFIG_COLORS[fallbackIndex % TTK_CONFIG_COLORS.length];
}

export function getAvailableConfigColor(configs = []) {
  const used = new Set(configs.map((cfg) => cfg?.color).filter(Boolean));
  return TTK_CONFIG_COLORS.find((color) => !used.has(color))
    || TTK_CONFIG_COLORS[configs.length % TTK_CONFIG_COLORS.length];
}

export function withConfigColor(config, configs = []) {
  return {
    ...config,
    color: config?.color || getAvailableConfigColor(configs),
  };
}

export function cloneConfigResult(result) {
  if (!result) return null;
  return JSON.parse(JSON.stringify(result));
}

export function loadTtkCache(key) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

export function saveTtkCache(key, value) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Ignore storage quota and privacy-mode failures.
  }
}

function normalizeCachedText(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .toLowerCase();
}

function hasUsableCachedItemShape(item) {
  if (!item || typeof item !== 'object') return false;
  return Boolean(item.name)
    && (
      Boolean(item.image)
      || Number.isFinite(Number(item.damage))
      || Number.isFinite(Number(item.fireRate))
      || Number.isFinite(Number(item.muzzleVelocity))
      || Number.isFinite(Number(item.penetration))
      || Number.isFinite(Number(item.level))
      || Number.isFinite(Number(item.durability))
    );
}

export function resolveCachedItem(cachedItem, items = [], customItems = []) {
  if (!cachedItem) return null;

  const pools = cachedItem.isCustom ? [customItems, items] : [items, customItems];
  const candidates = pools.flat().filter(Boolean);
  const cachedId = cachedItem.id == null ? null : String(cachedItem.id);
  const cachedNames = [
    cachedItem.name,
    cachedItem.sourceName,
    cachedItem.baseName,
    cachedItem.templateName,
  ].filter(Boolean);
  const normalizedNames = cachedNames.map(normalizeCachedText).filter(Boolean);

  const byId = cachedId
    ? candidates.find((item) => item?.id != null && String(item.id) === cachedId)
    : null;
  if (byId) return byId;

  const byName = candidates.find((item) => cachedNames.some((name) => (
    item?.name === name || item?.sourceName === name
  )));
  if (byName) return byName;

  const byNormalizedName = candidates.find((item) => {
    const itemNames = [item?.name, item?.sourceName, item?.baseName, item?.templateName]
      .map(normalizeCachedText)
      .filter(Boolean);
    return itemNames.some((name) => normalizedNames.includes(name));
  });
  if (byNormalizedName) return byNormalizedName;

  return hasUsableCachedItemShape(cachedItem) ? cachedItem : null;
}

export function resolveCachedModIds(ids = [], modifications = []) {
  if (!Array.isArray(ids)) return [];
  const validIds = new Set((modifications || []).map((mod) => String(mod.id)));
  return ids.filter((id) => validIds.has(String(id)));
}

export function getModNames(modIds = [], modifications = [], limit = 5) {
  const names = modIds
    .map((id) => modifications.find((mod) => String(mod.id) === String(id))?.name)
    .filter(Boolean);
  const visible = names.slice(0, limit);
  const remaining = Math.max(0, names.length - visible.length);
  return {
    visible,
    remaining,
    label: names.length ? `${visible.join(' / ')}${remaining ? ` / +${remaining} 配件` : ''}` : '无配件',
  };
}
