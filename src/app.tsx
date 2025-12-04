import { PropsWithChildren, useState, useEffect } from 'react'
import { useLaunch } from '@tarojs/taro'
import { View } from '@tarojs/components'
import { UserProvider } from './contexts/UserContext'
import { loadRemoteConfig } from './utils/terminology'

import './app.scss'

function App({ children }: PropsWithChildren<any>) {
  const [ready, setReady] = useState(false)

  useLaunch(() => {
    console.log('App launched.')
  })

  useEffect(() => {
    // 启动时加载远程配置，最多等待1秒
    loadRemoteConfig().finally(() => {
      setReady(true)
    })
  }, [])

  // 使用 opacity + visibility 替代 display:none
  // 这样可以保留布局计算，避免首次渲染时视口尺寸计算错误
  const containerStyle = ready
    ? { opacity: 1, visibility: 'visible' as const, transition: 'opacity 0.15s ease-out' }
    : { opacity: 0, visibility: 'hidden' as const }

  return (
    <UserProvider>
      <View style={containerStyle}>
        {children}
      </View>
    </UserProvider>
  )
}
  


export default App
