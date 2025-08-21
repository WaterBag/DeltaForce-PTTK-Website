export const getRarityClass = (rarity) => {
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