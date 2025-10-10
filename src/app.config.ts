export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/search/search',
    'pages/me/me',
    'pages/firm-detail/firm-detail',
    'pages/service-detail/service-detail',
    'pages/admin/firms/firms',
    'pages/admin/firms/edit/edit',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'WeChat',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    color: 'rgba(255, 255, 255, 0.7)',
    selectedColor: '#FFFFFF',
    backgroundColor: '#0f1016',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        iconPath: './assets/images/home.svg',
        selectedIconPath: './assets/images/home-active.svg'
      },
      {
        pagePath: 'pages/search/search',
        text: '搜索',
        iconPath: './assets/images/search.svg',
        selectedIconPath: './assets/images/search-active.svg'
      },
      {
        pagePath: 'pages/me/me',
        text: '我的',
        iconPath: './assets/images/me.svg',
        selectedIconPath: './assets/images/me-active.svg'
      }
    ]
  }
})
