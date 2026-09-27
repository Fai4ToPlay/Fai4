using UnityEngine;
namespace Skyline
{
    [RequireComponent(typeof(Rigidbody))]
    public sealed class MomentumController : MonoBehaviour
    {
        Rigidbody body; public Vector3 Velocity => body.linearVelocity; public float Speed => body.linearVelocity.magnitude;
        void Awake() => body = GetComponent<Rigidbody>();
        public void AddImpulse(Vector3 impulse) => body.AddForce(impulse, ForceMode.VelocityChange);
        public void Retain(float fraction) => body.linearVelocity *= Mathf.Clamp01(fraction);
        public void Limit(float maximum) { if (body.linearVelocity.sqrMagnitude > maximum * maximum) body.linearVelocity = body.linearVelocity.normalized * maximum; }
    }
}
