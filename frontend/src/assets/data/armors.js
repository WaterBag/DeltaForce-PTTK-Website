/**
 * 护甲数据配置文件
 * 包含游戏中所有护甲的详细属性数据
 * 用于TTK计算、伤害模拟和护甲选择
 *
 * 护甲属性说明：
 * - id: 护甲唯一标识符（与选择规则配置匹配）
 * - name: 护甲名称
 * - level: 防护等级（1-6级，决定对弹药的抗性）
 * - durability: 最大耐久度值
 * - chest: 是否保护胸部（1=保护，0=不保护）
 * - abdomen: 是否保护腹部（1=保护，0=不保护）
 * - upperArm: 是否保护上臂（1=保护，0=不保护）
 * - forearm: 是否保护前臂（1=保护，0=不保护）
 * - thigh: 是否保护大腿（1=保护，0=不保护）
 * - calf: 是否保护小腿（1=保护，0=不保护）
 * - image: 护甲图片资源
 */

// 导入所有护甲图片
import armor0 from '../../assets/images/armor/无.png';
import armor1001 from '../../assets/images/armor/摩托马甲.png';
import armor1002 from '../../assets/images/armor/安保防弹衣.png';
import armor1003 from '../../assets/images/armor/尼龙防弹衣.png';
import armor1004 from '../../assets/images/armor/轻型防弹衣.png';
import armor2001 from '../../assets/images/armor/简易防刺服.png';
import armor2002 from '../../assets/images/armor/HT战术背心.png';
import armor2003 from '../../assets/images/armor/TG战术防弹衣.png';
import armor2004 from '../../assets/images/armor/通用战术背心.png';
import armor3001 from '../../assets/images/armor/制式防弹背心.png';
import armor3002 from '../../assets/images/armor/Hvk快拆防弹衣.png';
import armor3003 from '../../assets/images/armor/TG-H防弹衣.png';
import armor3004 from '../../assets/images/armor/射手战术背心.png';
import armor4001 from '../../assets/images/armor/武士防弹背心.png';
import armor4002 from '../../assets/images/armor/HMP特勤防弹衣.png';
import armor4003 from '../../assets/images/armor/突击手防弹背心.png';
import armor4004 from '../../assets/images/armor/DT-AVS防弹衣.png';
import armor4005 from '../../assets/images/armor/MK-2战术背心.png';
import armor5001 from '../../assets/images/armor/精英防弹背心.png';
import armor5002 from '../../assets/images/armor/FS复合防弹衣.png';
import armor5003 from '../../assets/images/armor/Hvk-2防弹衣.png';
import armor5004 from '../../assets/images/armor/重型突击背心.png';
import armor6001 from '../../assets/images/armor/HA-2防弹装甲.png';
import armor6002 from '../../assets/images/armor/特里克MAS2.0装甲.png';
import armor6003 from '../../assets/images/armor/金刚防弹衣.png';
import armor6004 from '../../assets/images/armor/泰坦防弹装甲.png';

const armors = [
  {
    id: '0000',
    name: '无',
    level: 0,
    durability: 0,
    chest: 0,
    abdomen: 0,
    upperArm: 0,
    forearm: 0,
    thigh: 0,
    calf: 0,
    image: armor0,
  },
  {
    id: '1001',
    name: '摩托马甲',
    level: 1,
    durability: 20,
    chest: 1,
    abdomen: 0,
    upperArm: 0,
    forearm: 0,
    thigh: 0,
    calf: 0,
    image: armor1001,
  },
  {
    id: '1002',
    name: '安保防弹衣',
    level: 1,
    durability: 20,
    chest: 1,
    abdomen: 0,
    upperArm: 0,
    forearm: 0,
    thigh: 0,
    calf: 0,
    image: armor1002,
  },
  {
    id: '1003',
    name: '尼龙防弹衣',
    level: 1,
    durability: 25,
    chest: 1,
    abdomen: 0,
    upperArm: 0,
    forearm: 0,
    thigh: 0,
    calf: 0,
    image: armor1003,
  },
  {
    id: '1004',
    name: '轻型防弹衣',
    level: 1,
    durability: 30,
    chest: 1,
    abdomen: 0,
    upperArm: 0,
    forearm: 0,
    thigh: 0,
    calf: 0,
    image: armor1004,
  },
  {
    id: '2001',
    name: '简易防刺服',
    level: 2,
    durability: 30,
    chest: 1,
    abdomen: 0,
    upperArm: 0,
    forearm: 0,
    thigh: 0,
    calf: 0,
    image: armor2001,
  },
  {
    id: '2002',
    name: 'HT战术背心',
    level: 2,
    durability: 35,
    chest: 1,
    abdomen: 0,
    upperArm: 0,
    forearm: 0,
    thigh: 0,
    calf: 0,
    image: armor2002,
  },
  {
    id: '2003',
    name: 'TG战术防弹衣',
    level: 2,
    durability: 40,
    chest: 1,
    abdomen: 0,
    upperArm: 0,
    forearm: 0,
    thigh: 0,
    calf: 0,
    image: armor2003,
  },
  {
    id: '2004',
    name: '通用战术背心',
    level: 2,
    durability: 50,
    chest: 1,
    abdomen: 0,
    upperArm: 0,
    forearm: 0,
    thigh: 0,
    calf: 0,
    image: armor2004,
  },
  {
    id: '3001',
    name: '制式防弹背心',
    level: 3,
    durability: 50,
    chest: 1,
    abdomen: 0,
    upperArm: 0,
    forearm: 0,
    thigh: 0,
    calf: 0,
    image: armor3001,
  },
  {
    id: '3002',
    name: 'Hvk快拆防弹衣',
    level: 3,
    durability: 60,
    chest: 1,
    abdomen: 0,
    upperArm: 0,
    forearm: 0,
    thigh: 0,
    calf: 0,
    image: armor3002,
  },
  {
    id: '3003',
    name: 'TG-H防弹衣',
    level: 3,
    durability: 75,
    chest: 1,
    abdomen: 1,
    upperArm: 0,
    forearm: 0,
    thigh: 0,
    calf: 0,
    image: armor3003,
  },
  {
    id: '3004',
    name: '射手战术背心',
    level: 3,
    durability: 85,
    chest: 1,
    abdomen: 1,
    upperArm: 0,
    forearm: 0,
    thigh: 0,
    calf: 0,
    image: armor3004,
  },
  {
    id: '4001',
    name: '武士防弹背心',
    level: 4,
    durability: 80,
    chest: 1,
    abdomen: 0,
    upperArm: 0,
    forearm: 0,
    thigh: 0,
    calf: 0,
    image: armor4001,
  },
  {
    id: '4002',
    name: 'HMP特勤防弹衣',
    level: 4,
    durability: 80,
    chest: 1,
    abdomen: 0,
    upperArm: 0,
    forearm: 0,
    thigh: 0,
    calf: 0,
    image: armor4002,
  },
  {
    id: '4003',
    name: '突击手防弹背心',
    level: 4,
    durability: 90,
    chest: 1,
    abdomen: 1,
    upperArm: 0,
    forearm: 0,
    thigh: 0,
    calf: 0,
    image: armor4003,
  },
  {
    id: '4004',
    name: 'DT-AVS防弹衣',
    level: 4,
    durability: 100,
    chest: 1,
    abdomen: 1,
    upperArm: 0,
    forearm: 0,
    thigh: 0,
    calf: 0,
    image: armor4004,
  },
  {
    id: '4005',
    name: 'MK-2战术背心',
    level: 4,
    durability: 110,
    chest: 1,
    abdomen: 1,
    upperArm: 0,
    forearm: 0,
    thigh: 0,
    calf: 0,
    image: armor4005,
  },
  {
    id: '5001',
    name: '精英防弹背心',
    level: 5,
    durability: 95,
    chest: 1,
    abdomen: 1,
    upperArm: 0,
    forearm: 0,
    thigh: 0,
    calf: 0,
    image: armor5001,
  },
  {
    id: '5002',
    name: 'FS复合防弹衣',
    level: 5,
    durability: 105,
    chest: 1,
    abdomen: 1,
    upperArm: 0,
    forearm: 0,
    thigh: 0,
    calf: 0,
    image: armor5002,
  },
  {
    id: '5003',
    name: 'Hvk-2防弹衣',
    level: 5,
    durability: 115,
    chest: 1,
    abdomen: 1,
    upperArm: 1,
    forearm: 0,
    thigh: 0,
    calf: 0,
    image: armor5003,
  },
  {
    id: '5004',
    name: '重型突击背心',
    level: 5,
    durability: 125,
    chest: 1,
    abdomen: 1,
    upperArm: 1,
    forearm: 0,
    thigh: 0,
    calf: 0,
    image: armor5004,
  },
  {
    id: '6001',
    name: 'HA-2防弹装甲',
    level: 6,
    durability: 115,
    chest: 1,
    abdomen: 1,
    upperArm: 1,
    forearm: 0,
    thigh: 0,
    calf: 0,
    image: armor6001,
  },
  {
    id: '6002',
    name: '特里克MAS2.0装甲',
    level: 6,
    durability: 125,
    chest: 1,
    abdomen: 1,
    upperArm: 1,
    forearm: 0,
    thigh: 0,
    calf: 0,
    image: armor6002,
  },
  {
    id: '6003',
    name: '金刚防弹衣',
    level: 6,
    durability: 140,
    chest: 1,
    abdomen: 1,
    upperArm: 1,
    forearm: 0,
    thigh: 0,
    calf: 0,
    image: armor6003,
  },
  {
    id: '6004',
    name: '泰坦防弹装甲',
    level: 6,
    durability: 150,
    chest: 1,
    abdomen: 1,
    upperArm: 1,
    forearm: 0,
    thigh: 0,
    calf: 0,
    image: armor6004,
  },
];

export default armors;
