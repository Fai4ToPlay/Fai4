using UnityEngine;
namespace Skyline
{
    public sealed class SwingAssist : MonoBehaviour
    {
        public Vector3 Calculate(Vector3 position, Vector3 velocity, Vector3 anchor, Vector3 desiredForward, WebSwingSettings s)
        {
            Vector3 radial=(position-anchor).normalized; Vector3 tangent=Vector3.ProjectOnPlane(desiredForward,radial).normalized;
            float low=Mathf.Clamp01((s.minimumSwingHeight-position.y)/Mathf.Max(1,s.minimumSwingHeight));
            return (tangent*s.forwardAcceleration + Vector3.up*low*s.forwardAcceleration)*s.swingAssistStrength;
        }
    }
}
