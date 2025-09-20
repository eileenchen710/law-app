export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/search/search',
    'pages/me/me',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'WeChat',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    color: '#7A7E83',
    selectedColor: '#3cc51f',
    backgroundColor: '#fff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        iconPath: './assets/images/home.png',
        selectedIconPath: './assets/images/home-active.png'
      },
      {
        pagePath: 'pages/search/search',
        text: '搜索',
        iconPath: './assets/images/search.png',
        selectedIconPath: './assets/images/search-active.png'
      },
      {
        pagePath: 'pages/me/me',
        text: '我的',
        iconPath: './assets/images/me.png',
        selectedIconPath: './assets/images/me-active.png'
      }
    ]
  }
})
