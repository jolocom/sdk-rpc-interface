import QRCode from 'qrcode'

export const encodeAsQrCode = async (interactionMessage: string) => {
    return await QRCode.toDataURL(interactionMessage)

}

export const encodeAsDeepLink = (interactionMessage: string) => `jolocomwallet://consent/${interactionMessage}`
