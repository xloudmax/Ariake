import { notification } from 'antd'
import { NotificationPlacement } from 'antd/es/notification/interface'

// 统一错误提示函数
export const showErrorNotification = (
  message: string,
  description?: string,
  placement: NotificationPlacement = 'topRight'
) => {
  notification.error({
    message,
    description,
    placement,
    duration: 5,
  })
}

// 统一成功提示函数
export const showSuccessNotification = (
  message: string,
  description?: string,
  placement: NotificationPlacement = 'topRight'
) => {
  notification.success({
    message,
    description,
    placement,
    duration: 3,
  })
}

// 统一警告提示函数
export const showWarningNotification = (
  message: string,
  description?: string,
  placement: NotificationPlacement = 'topRight'
) => {
  notification.warning({
    message,
    description,
    placement,
    duration: 5,
  })
}

// 统一信息提示函数
export const showInfoNotification = (
  message: string,
  description?: string,
  placement: NotificationPlacement = 'topRight'
) => {
  notification.info({
    message,
    description,
    placement,
    duration: 3,
  })
}

export default {
  showErrorNotification,
  showSuccessNotification,
  showWarningNotification,
  showInfoNotification,
}
