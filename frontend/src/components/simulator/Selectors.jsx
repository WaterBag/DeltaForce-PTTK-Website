import { GenericSelector } from '../public/GenericSelector.jsx';
import './Selectors.css';
import { weapons } from '../../assets/data/weapons';

const CREATE_CUSTOM_WEAPON_ID = '__create_custom_weapon__';

export const WeaponSelector = ({
  selectedWeapon,
  onSelect,
  options,
  onCreateCustom,
}) => {
  const baseWeapons = Array.isArray(options)
    ? options
    : weapons.filter((weapon) => !weapon.isModification);

  const createLabel = selectedWeapon?.isCustom ? '✎ 修改自定义枪械' : '＋ 添加自定义枪械';
  const selectableWeapons = onCreateCustom
    ? [{ id: CREATE_CUSTOM_WEAPON_ID, name: createLabel, isAction: true }, ...baseWeapons]
    : baseWeapons;

  const handleSelect = (weapon) => {
    if (weapon?.id === CREATE_CUSTOM_WEAPON_ID) {
      onCreateCustom(selectedWeapon);
      return;
    }
    onSelect(weapon);
  };

  return (
    <GenericSelector
      options={selectableWeapons}
      selectedOption={selectedWeapon}
      onSelect={handleSelect}
      placeholder="选择武器"
      className="weapon-selector"
      renderOption={(weapon) => (
        weapon.isAction ? (
          <span className="weapon-create-option">{weapon.name}</span>
        ) : (
          <>
            {weapon.image ? (
              <img src={weapon.image} alt={weapon.name} className="weapon-option-image weapon-option-image-list" />
            ) : null}
            <span className="weapon-option-name">{weapon.name}</span>
          </>
        )
      )}
      renderSelected={(weapon) => (
        <>
          {weapon.image ? (
            <img src={weapon.image} alt={weapon.name} className="weapon-option-image" />
          ) : null}
          <span className="weapon-option-name">{weapon.name}</span>
        </>
      )}
    />
  );
};
