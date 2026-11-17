const frame = new URL('./artwork/sitcon-2027-frame.png', import.meta.url).href;
const facebookCover = new URL('./artwork/facebook-cover.png', import.meta.url).href;
const lineBackground = new URL('./artwork/line-background.png', import.meta.url).href;

export default {
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
