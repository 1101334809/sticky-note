/**
 * Win32 API 绑定 — 通过 koffi 调用 user32.dll
 *
 * 提供 SendInput 鼠标点击模拟和 GetCursorPos 光标位置获取
 */
import koffi from 'koffi'

// ======== Win32 常量 ========
const INPUT_MOUSE = 0
const MOUSEEVENTF_LEFTDOWN = 0x0002
const MOUSEEVENTF_LEFTUP = 0x0004
const MOUSEEVENTF_RIGHTDOWN = 0x0008
const MOUSEEVENTF_RIGHTUP = 0x0010
const MOUSEEVENTF_MIDDLEDOWN = 0x0020
const MOUSEEVENTF_MIDDLEUP = 0x0040
const MOUSEEVENTF_ABSOLUTE = 0x8000

// ======== 结构体定义 ========

// GetCursorPos 使用的 POINT 结构体
const POINT = koffi.struct('POINT', {
  x: 'long',
  y: 'long',
})

const MOUSEINPUT = koffi.struct('MOUSEINPUT', {
  dx: 'long',
  dy: 'long',
  mouseData: 'uint32',
  dwFlags: 'uint32',
  time: 'uint32',
  dwExtraInfo: 'uintptr',
})

/*
 * Win32 INPUT 结构体包含一个 union（MOUSEINPUT/KEYBDINPUT/HARDWAREINPUT）。
 * KEYBDINPUT = 16 字节，HARDWAREINPUT = 8 字节，MOUSEINPUT = 24/28 字节（最大）。
 * 我们只用鼠标输入，koffi 的 struct 会自动处理大小和对齐。
 */
const INPUT = koffi.struct('INPUT', {
  type: 'uint32',
  mi: MOUSEINPUT,
})

// ======== 加载 DLL ========
const user32 = koffi.load('user32.dll')

// ======== 函数绑定 ========
const SendInput = user32.func('uint32 SendInput(uint32 cInputs, INPUT *pInputs, int32 cbSize)')
const GetCursorPos = user32.func('bool GetCursorPos(_Out_ POINT *lpPoint)')
const GetSystemMetrics = user32.func('int32 GetSystemMetrics(int32 nIndex)')

// 缓存屏幕尺寸
let _screenW = 0
let _screenH = 0
function getScreenSize() {
  if (_screenW === 0) {
    _screenW = GetSystemMetrics(0) // SM_CXSCREEN
    _screenH = GetSystemMetrics(1) // SM_CYSCREEN
    console.log(`[win32] 屏幕分辨率: ${_screenW}x${_screenH}`)
  }
  return { w: _screenW, h: _screenH }
}

// ======== 导出函数 ========

/**
 * 获取当前光标屏幕坐标
 */
export function getCursorPosition(): { x: number; y: number } {
  const pt = { x: 0, y: 0 }
  GetCursorPos(pt)
  return { x: pt.x, y: pt.y }
}

/**
 * 将屏幕坐标转换为 SendInput 所需的绝对坐标（0~65535）
 */
function toAbsoluteCoord(x: number, y: number): { ax: number; ay: number } {
  const { w, h } = getScreenSize()
  return {
    ax: Math.round((x * 65535) / (w - 1)),
    ay: Math.round((y * 65535) / (h - 1)),
  }
}

/**
 * 在指定位置模拟鼠标点击
 */
export function mouseClick(
  x: number,
  y: number,
  button: 'left' | 'right' | 'middle' = 'left'
): void {
  const { ax, ay } = toAbsoluteCoord(x, y)

  let downFlag: number
  let upFlag: number

  switch (button) {
    case 'right':
      downFlag = MOUSEEVENTF_RIGHTDOWN
      upFlag = MOUSEEVENTF_RIGHTUP
      break
    case 'middle':
      downFlag = MOUSEEVENTF_MIDDLEDOWN
      upFlag = MOUSEEVENTF_MIDDLEUP
      break
    default:
      downFlag = MOUSEEVENTF_LEFTDOWN
      upFlag = MOUSEEVENTF_LEFTUP
  }

  const inputSize = koffi.sizeof(INPUT)

  // 先 down 后 up，分两次调用确保可靠性
  const downInput = {
    type: INPUT_MOUSE,
    mi: { dx: ax, dy: ay, mouseData: 0, dwFlags: MOUSEEVENTF_ABSOLUTE | downFlag, time: 0, dwExtraInfo: 0 },
  }
  const resultDown = SendInput(1, [downInput], inputSize)

  const upInput = {
    type: INPUT_MOUSE,
    mi: { dx: ax, dy: ay, mouseData: 0, dwFlags: MOUSEEVENTF_ABSOLUTE | upFlag, time: 0, dwExtraInfo: 0 },
  }
  const resultUp = SendInput(1, [upInput], inputSize)

  if (resultDown === 0 || resultUp === 0) {
    console.warn(`[win32] SendInput 返回 0，可能被 UIPI 阻止。pos=(${x},${y}) button=${button}`)
  }
}

/**
 * 模拟双击
 */
export function mouseDoubleClick(
  x: number,
  y: number,
  button: 'left' | 'right' | 'middle' = 'left'
): void {
  mouseClick(x, y, button)
  mouseClick(x, y, button)
}
