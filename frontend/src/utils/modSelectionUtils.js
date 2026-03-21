// 通用配件选择/槽位解锁工具

function normalizeSlotList(raw) {
  if (Array.isArray(raw)) {
    return raw
      .flatMap((item) => normalizeSlotList(item))
      .filter((slot) => typeof slot === 'string' && slot.trim().length > 0);
  }

  if (typeof raw === 'string') {
    const slot = raw.trim();
    return slot ? [slot] : [];
  }

  if (raw && typeof raw === 'object') {
    if (Array.isArray(raw.slots)) return normalizeSlotList(raw.slots);
    if (Array.isArray(raw.values)) return normalizeSlotList(raw.values);
    if (typeof raw.name === 'string') return normalizeSlotList(raw.name);
    if (typeof raw.slot === 'string') return normalizeSlotList(raw.slot);
  }

  return [];
}

function getModSlots(mod) {
  return normalizeSlotList(
    mod?.type
      ?? mod?.types
      ?? mod?.slotType
      ?? mod?.slotTypes
  );
}

function getRequiresSlots(mod) {
  return normalizeSlotList(
    mod?.requiresSlots
      ?? mod?.requires_slots
      ?? mod?.requiredSlots
      ?? mod?.required_slots
  );
}

function getUnlockSlots(mod) {
  return normalizeSlotList(
    mod?.effects?.unlockSlots
      ?? mod?.effects?.unlock_slots
      ?? mod?.unlockSlots
      ?? mod?.unlock_slots
  );
}

export function inferBaseUnlockedSlots(mods = []) {
  const required = new Set();
  const unlockable = new Set();

  (mods || []).forEach((mod) => {
    getRequiresSlots(mod).forEach((slot) => required.add(slot));
    getUnlockSlots(mod).forEach((slot) => unlockable.add(slot));
  });

  const base = new Set();
  required.forEach((slot) => {
    if (!unlockable.has(slot)) base.add(slot);
  });
  return base;
}

export function buildModsById(mods = []) {
  return (mods || []).reduce((acc, mod) => {
    if (mod?.id) acc[mod.id] = mod;
    return acc;
  }, {});
}

export function computeUnlockedSlots(selectedModIds = [], modsById = {}) {
  const unlocked = new Set();

  (selectedModIds || []).forEach((id) => {
    const mod = modsById[id];
    const unlockSlots = getUnlockSlots(mod);
    unlockSlots.forEach((slot) => unlocked.add(slot));
  });

  return unlocked;
}

export function mergeUnlockedSlots(baseUnlockedSlots, unlockedSlots) {
  const merged = new Set();

  if (baseUnlockedSlots instanceof Set) {
    baseUnlockedSlots.forEach((slot) => slot && merged.add(slot));
  } else if (Array.isArray(baseUnlockedSlots)) {
    baseUnlockedSlots.forEach((slot) => slot && merged.add(slot));
  }

  if (unlockedSlots instanceof Set) {
    unlockedSlots.forEach((slot) => slot && merged.add(slot));
  } else if (Array.isArray(unlockedSlots)) {
    unlockedSlots.forEach((slot) => slot && merged.add(slot));
  }

  return merged;
}

export function isModSelectable(mod, unlockedSlots) {
  const requiresSlots = getRequiresSlots(mod);
  if (requiresSlots.length === 0) return true;

  if (requiresSlots.every((slot) => unlockedSlots.has(slot))) return true;

  // 兼容新数据：requiresSlots 与配件自身槽位一致时，视为基础槽位可用。
  const modSlots = getModSlots(mod);
  return requiresSlots.every((slot) => modSlots.includes(slot));
}

export function pruneSelectedMods(selectedModIds = [], modsById = {}) {
  let current = Array.isArray(selectedModIds) ? [...selectedModIds] : [];

  for (let i = 0; i < 10; i++) {
    const unlockedSlots = computeUnlockedSlots(current, modsById);
    const next = current.filter((id) => {
      const mod = modsById[id];
      if (!mod) return false;
      return isModSelectable(mod, unlockedSlots);
    });

    if (next.length === current.length) {
      return { selectedModIds: next, unlockedSlots };
    }
    current = next;
  }

  const unlockedSlots = computeUnlockedSlots(current, modsById);
  return { selectedModIds: current, unlockedSlots };
}

export function pruneSelectedModsWithBaseUnlock(
  selectedModIds = [],
  modsById = {},
  baseUnlockedSlots
) {
  let current = Array.isArray(selectedModIds) ? [...selectedModIds] : [];

  for (let i = 0; i < 10; i++) {
    const unlockedFromSelected = computeUnlockedSlots(current, modsById);
    const unlockedSlots = mergeUnlockedSlots(baseUnlockedSlots, unlockedFromSelected);

    const next = current.filter((id) => {
      const mod = modsById[id];
      if (!mod) return false;
      return isModSelectable(mod, unlockedSlots);
    });

    if (next.length === current.length) {
      return { selectedModIds: next, unlockedSlots };
    }
    current = next;
  }

  const unlockedFromSelected = computeUnlockedSlots(current, modsById);
  const unlockedSlots = mergeUnlockedSlots(baseUnlockedSlots, unlockedFromSelected);
  return { selectedModIds: current, unlockedSlots };
}

export function toggleModSelection({
  modId,
  isSelected,
  selectedModIds,
  availableMods,
  baseUnlockedSlots,
}) {
  const modsById = buildModsById(availableMods);
  const current = Array.isArray(selectedModIds) ? [...selectedModIds] : [];

  if (!isSelected) {
    const next = current.filter((id) => id !== modId);
    return pruneSelectedModsWithBaseUnlock(next, modsById, baseUnlockedSlots)
      .selectedModIds;
  }

  const mod = modsById[modId];
  const newModSlots = getModSlots(mod);
  if (newModSlots.length === 0) return current;

  const unlockedFromSelected = computeUnlockedSlots(current, modsById);
  const unlockedSlots = mergeUnlockedSlots(baseUnlockedSlots, unlockedFromSelected);
  if (!isModSelectable(mod, unlockedSlots)) {
    return current;
  }

  const nonConflicting = current.filter((oldModId) => {
    const oldMod = modsById[oldModId];
    const oldModSlots = getModSlots(oldMod);
    if (oldModSlots.length === 0) return false;
    const hasConflict = oldModSlots.some((slot) => newModSlots.includes(slot));
    return !hasConflict;
  });

  const next = [...nonConflicting, modId];
  return pruneSelectedModsWithBaseUnlock(next, modsById, baseUnlockedSlots)
    .selectedModIds;
}
