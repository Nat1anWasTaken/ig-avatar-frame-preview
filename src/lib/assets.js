import sitconFrame from '../../frames/sitcon-2027-frame.png';

// scene snapshots and the assets they reference are served as-is from public/
export const pub = (p) => import.meta.env.BASE_URL + p;

export const PRESETS = [
  { key: 'sitcon-2027', label: 'SITCON 2027', src: sitconFrame },
  { key: 'none', label: '不加框', src: null },
];

export const LABELS = {
  'home': '首頁', 'inbox': '私訊',
  'story-normal': '限時動態', 'story-close-friends': '摯友限時動態', 'post-author': '貼文作者',
  'own-sidebar': '右上角帳號', 'own-nav': '導覽列', 'note': '便利貼', 'chat-list': '聊天列表',
};

export const DEVICES = [
  { key: 'mobile', label: '手機版', description: '手機瀏覽器上的首頁與私訊' },
  { key: 'desktop', label: '電腦版', description: 'instagram.com 首頁與私訊' },
];
