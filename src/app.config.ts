export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/search/search',
    'pages/me/me',
    'pages/firm-detail/firm-detail',
    'pages/service-detail/service-detail',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'WeChat',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#FFFFFF',
    backgroundColor: '#000000',
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
