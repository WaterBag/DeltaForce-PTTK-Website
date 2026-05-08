import { useEffect } from 'react';

const SITE_ORIGIN = 'https://dfttk.com';
const SITE_NAME = '三角洲行动枪械击杀用时查询';
const DEFAULT_IMAGE = `${SITE_ORIGIN}/favicon.ico`;

const SEO_BY_PATH = {
  '/firefight/ttk': {
    title: '三角洲行动烽火 TTK 查询 - 枪械击杀用时模拟',
    description: '三角洲行动烽火行动 TTK 模拟器，支持枪械、弹药、头甲、配件、命中概率和对比曲线配置。',
  },
  '/firefight/simulator': {
    title: '三角洲行动烽火 伤害模拟器 - 部位伤害与击倒模拟',
    description: '模拟三角洲行动烽火行动枪械命中不同部位、护甲和头盔后的伤害、剩余血量与击倒结果。',
  },
  '/firefight/library': {
    title: '三角洲行动烽火 数据图鉴 - 枪械弹药护甲配件数据',
    description: '查看三角洲行动烽火行动枪械、弹药、护甲、头盔和配件数据，包含伤害、射速、射程和穿甲信息。',
  },
  '/battlefield/ttk': {
    title: '三角洲行动战场 TTK 查询 - 战场模式枪械击杀用时',
    description: '三角洲行动战场模式 TTK 模拟器，支持战场枪械、配件、命中概率、扳机延迟和枪口初速对比。',
  },
  '/battlefield/simulator': {
    title: '三角洲行动战场 伤害模拟器 - 枪械部位伤害模拟',
    description: '模拟三角洲行动战场模式枪械命中头部、胸部、腹部和四肢后的伤害与击倒过程。',
  },
  '/battlefield/library': {
    title: '三角洲行动战场 数据图鉴 - 战场枪械与配件数据',
    description: '查看三角洲行动战场模式枪械数据、配件配置、基础伤害、射速、枪口初速和射程衰减。',
  },
};

function setMeta(selector, attributes) {
  let node = document.head.querySelector(selector);
  if (!node) {
    node = document.createElement('meta');
    document.head.appendChild(node);
  }
  Object.entries(attributes).forEach(([name, value]) => {
    node.setAttribute(name, value);
  });
}

function setLink(rel, href) {
  let node = document.head.querySelector(`link[rel="${rel}"]`);
  if (!node) {
    node = document.createElement('link');
    node.setAttribute('rel', rel);
    document.head.appendChild(node);
  }
  node.setAttribute('href', href);
}

export function usePageSeo(pathname) {
  useEffect(() => {
    const seo = SEO_BY_PATH[pathname] || SEO_BY_PATH['/firefight/ttk'];
    const url = `${SITE_ORIGIN}${pathname === '/' ? '/firefight/ttk' : pathname}`;

    document.title = seo.title;
    setMeta('meta[name="description"]', { name: 'description', content: seo.description });
    setMeta('meta[name="keywords"]', {
      name: 'keywords',
      content: '三角洲行动TTK,三角洲行动枪械数据,三角洲行动战场,三角洲行动烽火,枪械击杀用时,DFTTK',
    });
    setMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: SITE_NAME });
    setMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
    setMeta('meta[property="og:title"]', { property: 'og:title', content: seo.title });
    setMeta('meta[property="og:description"]', { property: 'og:description', content: seo.description });
    setMeta('meta[property="og:url"]', { property: 'og:url', content: url });
    setMeta('meta[property="og:image"]', { property: 'og:image', content: DEFAULT_IMAGE });
    setMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary' });
    setMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: seo.title });
    setMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: seo.description });
    setMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: DEFAULT_IMAGE });
    setLink('canonical', url);
  }, [pathname]);
}
