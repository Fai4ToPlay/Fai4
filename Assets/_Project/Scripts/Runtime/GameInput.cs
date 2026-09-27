using UnityEngine;
using UnityEngine.InputSystem;

namespace Skyline
{
    public sealed class GameInput : MonoBehaviour
    {
        public Vector2 Move { get; private set; }
        public Vector2 Look { get; private set; }
        public bool SwingHeld { get; private set; }
        public bool SprintHeld { get; private set; }
        public bool JumpPressed { get; private set; }
        public bool ZipPressed { get; private set; }
        public bool TrickPressed { get; private set; }
        public bool AutoSwing = false;

        void Update()
        {
            JumpPressed = ZipPressed = TrickPressed = false; Look = Vector2.zero;
            var kb = Keyboard.current; var mouse = Mouse.current;
            if (kb != null) {
                Move = new Vector2((kb.dKey.isPressed?1:0)-(kb.aKey.isPressed?1:0), (kb.wKey.isPressed?1:0)-(kb.sKey.isPressed?1:0)).normalized;
                JumpPressed |= kb.spaceKey.wasPressedThisFrame; SprintHeld = kb.leftShiftKey.isPressed;
                TrickPressed |= kb.qKey.wasPressedThisFrame || kb.eKey.wasPressedThisFrame || kb.leftCtrlKey.wasPressedThisFrame;
            }
            if (mouse != null) { Look = mouse.delta.ReadValue(); SwingHeld = mouse.leftButton.isPressed; ZipPressed |= mouse.rightButton.wasPressedThisFrame; }
            var touch = Touchscreen.current; bool moveTouch=false, swingTouch=false;
            if (touch != null) {
                Vector2 size = new(Screen.width, Screen.height);
                foreach (var finger in touch.touches) {
                    if (!finger.press.isPressed) continue; Vector2 p=finger.position.ReadValue(), d=finger.delta.ReadValue();
                    if(p.x<size.x*.45f){moveTouch=true;Vector2 center=new(size.x*.17f,size.y*.22f);Move=Vector2.ClampMagnitude((p-center)/(size.y*.14f),1);}
                    else if(p.x<size.x*.72f)Look+=d*.7f;
                    else if(p.y<size.y*.42f){swingTouch=true;SwingHeld=true;}
                    else if(p.x>size.x*.88f)JumpPressed|=finger.press.wasPressedThisFrame;
                    else ZipPressed|=finger.press.wasPressedThisFrame;
                }
                if(!moveTouch)Move=Vector2.zero;if(!swingTouch)SwingHeld=false;
            }
        }
        public void SetMove(Vector2 v) => Move = Vector2.ClampMagnitude(v, 1);
        public void AddLook(Vector2 v) => Look += v;
        public void SetSwing(bool held) => SwingHeld = held;
        public void PressJump() => JumpPressed = true;
        public void PressZip() => ZipPressed = true;
        public void PressTrick() => TrickPressed = true;
    }
}
