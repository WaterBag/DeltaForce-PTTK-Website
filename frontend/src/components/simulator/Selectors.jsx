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


export const AmmoSelector = ({selectedWeapon, selectedAmmo, onSelect}) => {

  const availableAmmos = selectedWeapon 
    ? ammos.filter(ammo => ammo.caliber === selectedWeapon.caliber )
    : [];

  const getRarityClass = (rarity) => {
    switch(rarity){
      case '红' :return'rarity-red';
      case '橙': return 'rarity-orange';
      case '紫': return 'rarity-purple';
      case '蓝': return 'rarity-blue';
      case '绿': return 'rarity-green';
      case '白': return 'rarity-white';
      default: return '';
    }
  }
  
  return (
    <GenericSelector
      options={availableAmmos}
      selectedOption={selectedAmmo}
      onSelect={onSelect}
      placeholder={selectedWeapon ? "选择弹药":"请先选择武器"}
      searchable = {false}
      className='ammo-selector'
      renderSelected={(ammo) => (
        <>
          <img src={ammo.image} alt={ammo.name} className={`ammo-option-image ${getRarityClass(ammo.rarity)}`} />
          <span className="ammo-option-name">{ammo.caliber}</span>
          <span className="ammo-option-name">{ammo.name}</span>
          <div className='ammo-option-info'>
            <div className='stats'>
              <span>穿透等级：{ammo.penetration}</span>
              <span>肉伤系数：{ammo.fleshDamageCoeff}</span>
            </div>
          </div>
        </>
      )}
      renderOption={(ammo) => (
        <>
          <img src={ammo.image} alt={ammo.name} className={`ammo-option-image ${getRarityClass(ammo.rarity)}`} />
          <span className="ammo-option-name">{ammo.caliber}</span>
          <span className="ammo-option-name">{ammo.name}</span>
          <div className='ammo-option-info'>
            <div className='stats'>
              <span>穿透等级：{ammo.penetration}</span>
              <span>肉伤系数：{ammo.fleshDamageCoeff}</span>
            </div>
          </div>
        </>
      )}
    />
  )
}
