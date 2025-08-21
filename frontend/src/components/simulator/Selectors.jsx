import GenericSelector from '../public/GenericSelector';
import './Selectors.css'; // 样式文件
import { weapons } from '../../assets/data/weapons';
import { ammos } from '../../assets/data/ammos';


export const WeaponSelector = ({ selectedWeapon, onSelect }) => {
  return (
    <GenericSelector
      options={weapons}
      selectedOption={selectedWeapon}
      onSelect={onSelect}
      placeholder="选择武器"
      className="weapon-selector"
      renderSelected={(weapon) => (
        <>
          <img src={weapon.image} alt={weapon.name} className="weapon-option-image" />
          <span className="weapon-option-name">{weapon.name}</span>
        </>
      )}
    />
  );
};


