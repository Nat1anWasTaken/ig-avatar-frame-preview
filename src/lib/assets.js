import sitconFrame from '../../frames/sitcon-2027-frame.png';
import facebookCover from '../../banners/facebook-cover.png';
import lineBackground from '../../banners/line-background.png';

// scene snapshots and the assets they reference are served as-is from public/
export const pub = (p) => import.meta.env.BASE_URL + p;

export const PRESETS = [
  { key: 'sitcon-2027', label: 'SITCON 2027', src: sitconFrame },
  { key: 'none', label: '不加框', src: null },
];

const LABELS = {
  'home': '首頁', 'inbox': '私訊', 'profile': '個人檔案', 'notifications': '通知',
  'story-normal': '限時動態', 'story-close-friends': '摯友限時動態', 'post-author': '貼文作者',
  'own-sidebar': '右上角帳號', 'own-nav': '導覽列', 'note': '便利貼', 'chat-list': '聊天列表',
  'composer': '發文框', 'create-story': '建立限時動態', 'profile-picture': '大頭貼', 'notification': '通知',
  'cover': '封面相片',
  // Facebook puts the same spots elsewhere
  'facebook:own-sidebar': '左側選單', 'facebook:own-nav': '右上角帳號',
  'line:profile': '個人主頁',
};
export const label = (platform, key) => LABELS[`${platform}:${key}`] || LABELS[key] || key;

// What each platform's campaign kit holds besides the avatar. A banner fills
// the scene nodes marked data-slot="<slot>".
export const PLATFORMS = [
  { key: 'instagram', label: 'Instagram', devices: ['mobile', 'desktop'], banner: null },
  {
    key: 'facebook', label: 'Facebook', devices: ['mobile', 'desktop'],
    banner: { slot: 'cover', label: '封面相片', src: facebookCover, file: 'sitcon-2027-facebook-cover.png' },
  },
  {
    key: 'line', label: 'LINE', devices: ['mobile'],
    banner: { slot: 'background', label: '主頁背景', src: lineBackground, file: 'sitcon-2027-line-background.png' },
  },
];

export const DEVICES = [
  { key: 'mobile', label: '手機版' },
  { key: 'desktop', label: '電腦版' },
];
