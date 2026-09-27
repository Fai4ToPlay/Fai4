using UnityEngine;
namespace Skyline
{
    public static class RopePhysics
    {
        public static Vector3 ConstrainVelocity(Vector3 velocity, Vector3 ropeDirection)
        {
            float outward=Vector3.Dot(velocity,ropeDirection);
            return outward>0?velocity-ropeDirection*outward:velocity;
        }
        public static Vector3 TangentVelocity(Vector3 velocity,Vector3 ropeDirection)=>Vector3.ProjectOnPlane(velocity,ropeDirection);
    }
}
