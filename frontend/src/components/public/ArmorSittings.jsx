import { useMemo } from 'react';
import { GenericSelector } from '../public/GenericSelector';
import { getProtectionLevelClass } from '../../utils/styleUtils';
import './ArmorSittings.css';

const getLevelText = (level) => `${Number(level) || 0}级`;

const getHelmetDisplayName = (helmet) => `${getLevelText(helmet?.level)}头盔`;

const getArmorVariantTag = (armor) => {
  const hasShoulder = Boolean(armor?.upperArm || armor?.forearm);
  const hasAbdomen = Boolean(armor?.abdomen);

  if (hasShoulder) return '护肩';
  if (hasAbdomen) return '护腹';
  return '无差异';
};

const getArmorDisplayName = (armor, levelVariantTags) => {
  const base = `${getLevelText(armor?.level)}甲`;
  const variantTag = getArmorVariantTag(armor);
  const level = Number(armor?.level) || 0;

  if (level === 6 && levelVariantTags?.size === 1 && levelVariantTags?.has('护肩')) {
    return base;
  }

  if (variantTag === '无差异') return base;
  return `${base}（${variantTag}）`;
};

const pickRepresentativeByKind = (options = [], kindKeyGetter) => {
  const order = [];
  const bestByKey = new Map();

  (options || []).forEach((item) => {
    const key = kindKeyGetter(item);
    if (!bestByKey.has(key)) {
      order.push(key);
      bestByKey.set(key, item);
      return;
    }

    const currentBest = bestByKey.get(key);
    if ((Number(item?.durability) || 0) > (Number(currentBest?.durability) || 0)) {
      bestByKey.set(key, item);
    }
  });

  return order.map((key) => bestByKey.get(key)).filter(Boolean);
};

const getHelmetKindKey = (helmet) => String(Number(helmet?.level) || 0);
const getArmorKindKey = (armor) => `${Number(armor?.level) || 0}|${getArmorVariantTag(armor)}`;

export const HelmetSelector = ({ selectedHelmet, onSelect, options }) => {
  const clippedHelmetOptions = useMemo(
    () => pickRepresentativeByKind(options, getHelmetKindKey),
    [options]
  );

  return (
    <GenericSelector
      options={clippedHelmetOptions}
      selectedOption={selectedHelmet}
      onSelect={onSelect}
      placeholder="选择头盔"
      className="helmet-selector"
      searchable={false}
      renderOption={(helmet) => (
        <>
          <img src={helmet.image} alt={helmet.name} className="helmet-option-image" />
          <span className={`helmet-option-name ${getProtectionLevelClass(helmet.level)}`}>
            {getHelmetDisplayName(helmet)}
          </span>
        </>
      )}
      renderSelected={(helmet) => (
        <>
          <img src={helmet.image} alt={helmet.name} className="helmet-option-image" />
          <span className={`helmet-option-name ${getProtectionLevelClass(helmet.level)}`}>
            {getHelmetDisplayName(helmet)}
          </span>
        </>
      )}
    />
  );
};

export const ArmorSelector = ({ selectedArmor, onSelect, options }) => {
  const clippedArmorOptions = useMemo(
    () => pickRepresentativeByKind(options, getArmorKindKey),
    [options]
  );

  const variantTagsByLevel = useMemo(() => {
    const map = new Map();
    clippedArmorOptions.forEach((armor) => {
      const level = Number(armor?.level) || 0;
      const tag = getArmorVariantTag(armor);
      if (!map.has(level)) {
        map.set(level, new Set());
      }
      map.get(level).add(tag);
    });
    return map;
  }, [clippedArmorOptions]);

  const getDisplayName = (armor) => {
    const level = Number(armor?.level) || 0;
    return getArmorDisplayName(armor, variantTagsByLevel.get(level));
  };

  return (
    <GenericSelector
      options={clippedArmorOptions}
      selectedOption={selectedArmor}
      onSelect={onSelect}
      placeholder="选择护甲"
      className="armor-selector"
      searchable={false}
      renderOption={(armor) => (
        <>
          <img src={armor.image} alt={armor.name} className="helmet-option-image" />
          <span className={`helmet-option-name ${getProtectionLevelClass(armor.level)}`}>
            {getDisplayName(armor)}
          </span>
        </>
      )}
      renderSelected={(armor) => (
        <>
          <img src={armor.image} alt={armor.name} className="armor-option-image" />
          <span className={`armor-option-name ${getProtectionLevelClass(armor.level)}`}>
            {getDisplayName(armor)}
          </span>
        </>
      )}
    />
  );
};
