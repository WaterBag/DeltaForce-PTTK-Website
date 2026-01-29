// 通用配件选择/槽位解锁工具
// 目标：支持“某个配件解锁(新增)某些槽位”，并让 UI 通用处理禁用/级联移除。

export function buildModsById(mods = []) {
  // acc: { [modId]: mod }
  return (mods || []).reduce((acc, mod) => {
    if (mod?.id) acc[mod.id] = mod;
    return acc;
  }, {});
}

export function computeUnlockedSlots(selectedModIds = [], modsById = {}) {
  // unlocked: Set<string>，表示当前已解锁的槽位集合
  const unlocked = new Set();

  // 遍历已选择的配件，从它们的 effects.unlockSlots 中收集解锁槽位
  (selectedModIds || []).forEach((id) => {
    // mod: 当前配件对象
    const mod = modsById[id];
    // unlockSlots: 该配件可解锁的槽位列表
    const unlockSlots = mod?.effects?.unlockSlots;
    if (Array.isArray(unlockSlots)) {
      unlockSlots.forEach((slot) => {
        if (slot) unlocked.add(slot);
      });
    }
  });

  return unlocked;
}

export function mergeUnlockedSlots(baseUnlockedSlots, unlockedSlots) {
  // merged: Set<string>，将“基础解锁槽位”和“已选配件解锁槽位”合并
  const merged = new Set();

  // baseUnlockedSlots: 允许是 Set 或 Array（例如变体武器条目自带解锁）
  if (baseUnlockedSlots instanceof Set) {
    baseUnlockedSlots.forEach((slot) => slot && merged.add(slot));
  } else if (Array.isArray(baseUnlockedSlots)) {
    baseUnlockedSlots.forEach((slot) => slot && merged.add(slot));
  }

  // unlockedSlots: 允许是 Set 或 Array（通常来自 computeUnlockedSlots）
  if (unlockedSlots instanceof Set) {
    unlockedSlots.forEach((slot) => slot && merged.add(slot));
  } else if (Array.isArray(unlockedSlots)) {
    unlockedSlots.forEach((slot) => slot && merged.add(slot));
  }

  return merged;
}

export function isModSelectable(mod, unlockedSlots) {
  // requiresSlots: 该配件被选中所需满足的槽位集合
  const requiresSlots = mod?.requiresSlots;
  if (!Array.isArray(requiresSlots) || requiresSlots.length === 0) return true;
  // 只有当所有 required slot 都已解锁时，才允许选择
  return requiresSlots.every((slot) => unlockedSlots.has(slot));
}

export function pruneSelectedMods(selectedModIds = [], modsById = {}) {
  // 级联移除：当移除某个“解锁槽位”的配件后，可能导致其它配件失去槽位而必须被移除。
  // 因此做一个迭代直到稳定。
  // current: 当前保留的已选配件 id 列表
  let current = Array.isArray(selectedModIds) ? [...selectedModIds] : [];

  for (let i = 0; i < 10; i++) {
    // unlockedSlots: 由 current 中的配件解锁出来的槽位
    const unlockedSlots = computeUnlockedSlots(current, modsById);
    // next: 移除所有不满足 requiresSlots 的配件（可能触发进一步级联）
    const next = current.filter((id) => {
      // mod: 当前配件对象
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
  // 和 pruneSelectedMods 相同，但会将“基础已解锁槽位”纳入可选性判断。
  // current: 当前保留的已选配件 id 列表
  let current = Array.isArray(selectedModIds) ? [...selectedModIds] : [];

  for (let i = 0; i < 10; i++) {
    // unlockedFromSelected: 由 current 配件解锁出来的槽位
    const unlockedFromSelected = computeUnlockedSlots(current, modsById);
    // unlockedSlots: 最终解锁槽位（基础 + 已选解锁）
    const unlockedSlots = mergeUnlockedSlots(baseUnlockedSlots, unlockedFromSelected);

    // next: 移除所有不满足 requiresSlots 的配件（会考虑基础解锁槽位）
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
  // modsById: { [id]: mod }，用于快速查找
  const modsById = buildModsById(availableMods);
  // current: 当前已选配件 id 列表（拷贝一份避免直接修改入参）
  const current = Array.isArray(selectedModIds) ? [...selectedModIds] : [];

  if (!isSelected) {
    // 取消选择：先移除该配件，再做级联移除（考虑基础解锁槽位）
    const next = current.filter((id) => id !== modId);
    return pruneSelectedModsWithBaseUnlock(next, modsById, baseUnlockedSlots)
      .selectedModIds;
  }

  // 选择该配件：拿到配件对象与其槽位类型
  const mod = modsById[modId];
  if (!mod?.type) return current;

  // unlockedFromSelected: 当前已选配件解锁的槽位
  const unlockedFromSelected = computeUnlockedSlots(current, modsById);
  // unlockedSlots: 最终解锁槽位（基础 + 已选解锁）
  const unlockedSlots = mergeUnlockedSlots(baseUnlockedSlots, unlockedFromSelected);
  if (!isModSelectable(mod, unlockedSlots)) {
    // 槽位未解锁，不能选中
    return current;
  }

  // newModSlots: 新配件占用/所属槽位（用于冲突判断）
  const newModSlots = mod.type;

  // 选择新配件：移除所有与其槽位冲突的旧配件
  const nonConflicting = current.filter((oldModId) => {
    // oldMod: 已选中的旧配件
    const oldMod = modsById[oldModId];
    if (!oldMod?.type) return false;
    // hasConflict: 槽位冲突则需要被替换掉
    const hasConflict = oldMod.type.some((slot) => newModSlots.includes(slot));
    return !hasConflict;
  });

  // next: 先应用互斥替换，再加上本次选中配件
  const next = [...nonConflicting, modId];
  // 最终再跑一次“级联移除”，保证 requiresSlots 始终成立
  return pruneSelectedModsWithBaseUnlock(next, modsById, baseUnlockedSlots)
    .selectedModIds;
}
