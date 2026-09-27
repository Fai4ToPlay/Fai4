using UnityEngine;
namespace Skyline
{
    public sealed class AutoSwingController : MonoBehaviour
    {
        public GameInput input;public WebSwingController swing;public Rigidbody body;float attachedAt;
        void Update(){if(!input.AutoSwing||!input.SwingHeld)return;if(!swing.IsSwinging){swing.TryAttach();attachedAt=Time.time;return;}Vector3 radial=(transform.position-swing.Anchor).normalized;float outward=Vector3.Dot(body.linearVelocity,radial);if(Time.time-attachedAt>.7f&&body.linearVelocity.y>2&&outward>.2f){swing.Release();swing.TryAttach();attachedAt=Time.time;}}
    }
}
