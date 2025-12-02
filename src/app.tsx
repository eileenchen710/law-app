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

  return (
    <UserProvider>
      <View style={{ display: ready ? 'block' : 'none' }}>
        {children}
      </View>
    </UserProvider>
  )
}
  


export default App
