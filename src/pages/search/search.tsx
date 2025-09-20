import { View, Text } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import './search.scss'

export default function Me () {
  useLoad(() => {
    console.log('Page loaded.')
  })

  return (
    <View className='index'>
      <Text>Hello me!</Text>
    </View>
  )
}
