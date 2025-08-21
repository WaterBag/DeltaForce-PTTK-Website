import { API_BASE_URL } from './config';

export async function fetchAvailableGuns({helmetLevel,
  armorLevel,
  helmetDurability,
  armorDurability,
  chestProtection,
  stomachProtection,
  armProtection}) {
    if (
        helmetLevel == null || armorLevel == null ||
        helmetDurability == null || armorDurability == null
    ) {
        throw new Error("fetchAvailableGuns 参数不完整");
    }
    const response = await fetch(`${API_BASE_URL}/api/ttk/available-guns`, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json'
        },
        body: JSON.stringify({
        helmetLevel,
        armorLevel,
        helmetDurability,
        armorDurability,
        chestProtection,
        stomachProtection,
        armProtection
        })
    });

  if (!response.ok) {
    throw new Error(`请求可用枪械失败: ${response.status}`);
  }

  return await response.json();
    
}

export async function fetchGunDetails({
    gunName,
    helmetLevel,
    armorLevel,
    helmetDurability,
    armorDurability,
    chestProtection,
    stomachProtection,
    armProtection
}) {
    if (!gunName ||
        helmetLevel == null || armorLevel == null ||
        helmetDurability == null || armorDurability == null
    ) {
        throw new Error("fetchGunDetails 参数不完整");
    }
    const response = await fetch(`${API_BASE_URL}/api/ttk/gun-details`, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json'
        },
        body: JSON.stringify({
        gunName,
        helmetLevel,
        armorLevel,
        helmetDurability,
        armorDurability,
        chestProtection,
        stomachProtection,
        armProtection
        })
    });

  if (!response.ok) {
    throw new Error(`请求枪械详情失败: ${response.status}`);
  }

  return await response.json();
    
}

export async function fetchCombinations({
  helmetLevel,
  armorLevel,
  helmetDurability,
  armorDurability,
  chestProtection,
  stomachProtection,
  armProtection
}) {
    if (
        helmetLevel == null || armorLevel == null ||
        helmetDurability == null || armorDurability == null
    ) {
        throw new Error("fetchCombinations 参数不完整");
    }
    const response = await fetch(`${API_BASE_URL}/api/ttk/combinations`, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json'
        },
        body: JSON.stringify({
        helmetLevel,
        armorLevel,
        helmetDurability,
        armorDurability,
        chestProtection,
        stomachProtection,
        armProtection
        })
    });

  if (!response.ok) {
    throw new Error(`请求组合失败: ${response.status}`);
  }

  return await response.json();
}


export async function fetchTtkCurve({
    weaponName,
    ammoName,
    helmetLevel,
    armorLevel,
    helmetDurability,
    armorDurability,
    chestProtection,
    stomachProtection,
    armProtection
}) {
    const response = await fetch(`${API_BASE_URL}/api/ttk/ttk-curve`, { // <--- 注意路径
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            weaponName,
            ammoName,
            helmetLevel,
            armorLevel,
            helmetDurability,
            armorDurability,
            chestProtection,
            stomachProtection,
            armProtection
        })
    });

    if (!response.ok) {
        throw new Error(`请求TTK曲线失败: ${response.status}`);
    }

    return await response.json();
}