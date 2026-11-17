import frame from '../../frames/sitcon-2027-frame.png';
import facebookCover from '../../banners/facebook-cover.png';
import lineBackground from '../../banners/line-background.png';

export const CAMPAIGN = {
  year: 2027,
  name: 'SITCON 2027',
  title: '換上 SITCON 2027',
  intro: '用今年的頭貼、封面與背景，讓更多朋友看見 SITCON 2027。',
  theme: '42',
  themeIntro: '答案是 42，那問題是什麼？',
  invitation: '一起換上 SITCON 2027，讓更多人看見學生計算機年會。',
  officialUrl: 'https://sitcon.org/2027/',
  themeUrl: 'https://sitcon.org/2027/cfp/#theme',
  url: 'https://sitcon.org/social-kit/2027/',
  artwork: [
    { key: 'avatar', title: '頭貼', src: frame, width: 1080, height: 1080, file: 'sitcon-2027-avatar.png' },
    { key: 'facebook', title: 'Facebook 封面相片', src: facebookCover, width: 851, height: 315, file: 'sitcon-2027-facebook-cover.png' },
    { key: 'line', title: 'LINE 主頁背景', src: lineBackground, width: 1080, height: 1920, file: 'sitcon-2027-line-background.png' },
  ],
};

export const ARTWORK = CAMPAIGN.artwork;
export const AVATAR = ARTWORK.find((item) => item.key === 'avatar');

// scene snapshots and the assets they reference are served as-is from public/
export const pub = (p) => import.meta.env.BASE_URL + p;

export const PRESETS = [
  { key: `sitcon-${CAMPAIGN.year}`, label: CAMPAIGN.name, src: AVATAR.src },
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
    banner: { slot: 'cover', src: ARTWORK.find((item) => item.key === 'facebook').src },
  },
  {
    key: 'line', label: 'LINE', devices: ['mobile'],
    banner: { slot: 'background', src: ARTWORK.find((item) => item.key === 'line').src },
  },
];

export const DEVICES = [
  { key: 'mobile', label: '手機版' },
  { key: 'desktop', label: '電腦版' },
];
