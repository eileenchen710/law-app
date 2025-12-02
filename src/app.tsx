import { PropsWithChildren, useState, useEffect } from 'react'
import { useLaunch } from '@tarojs/taro'
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

  // 等待配置加载完成再渲染
  if (!ready) {
    return null
  }

  return (
    <UserProvider>
      {children}
    </UserProvider>
  )
}
  


export default App
