using UnityEngine;

namespace Skyline
{
    [CreateAssetMenu(menuName = "Skyline/Web Swing Settings")]
    public sealed class WebSwingSettings : ScriptableObject
    {
        [Header("Rope")]
        [Min(1)] public float ropeLength = 32, minimumRopeLength = 8, maximumRopeLength = 65;
        [Header("Physical swing")]
        public float swingAcceleration = 13, forwardAcceleration = 9, maximumSwingAcceleration = 18;
        [Range(0, 2)] public float releaseBoost = 2.5f, gravityMultiplier = 1.05f;
        [Range(0, 1)] public float airResistance = .012f, airControl = .25f, momentumRetention = .98f;
        public float maximumSwingSpeed = 75, swingSteeringStrength = 5;
        [Header("Assist and anchors")]
        [Range(0, 1)] public float swingAssistStrength = .35f, autoAnchorStrength = .7f;
        public float anchorSearchRadius = 45, maximumAnchorDistance = 80, minimumAnchorHeight = 6, minimumSwingHeight = 3;
        [Header("Abilities")]
        public float webZipForce = 27, pointLaunchForce = 34;

        public void ClampValues()
        {
            minimumRopeLength = Mathf.Max(1, minimumRopeLength);
            maximumRopeLength = Mathf.Max(minimumRopeLength, maximumRopeLength);
            ropeLength = Mathf.Clamp(ropeLength, minimumRopeLength, maximumRopeLength);
        }
    }
}
