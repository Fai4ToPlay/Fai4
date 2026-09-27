using NUnit.Framework;
using UnityEngine;
namespace Skyline.Tests
{
    public sealed class RopePhysicsTests
    {
        [Test] public void Constraint_RemovesOutwardButPreservesTangent()
        {
            Vector3 result=RopePhysics.ConstrainVelocity(new Vector3(12,-8,20),Vector3.right);
            Assert.That(result.x,Is.EqualTo(0).Within(.0001f));Assert.That(result.y,Is.EqualTo(-8).Within(.0001f));Assert.That(result.z,Is.EqualTo(20).Within(.0001f));
        }
        [Test] public void TenReattachments_DoNotDestroyMomentum()
        {
            Vector3 velocity=new(20,-10,35);
            for(int i=0;i<10;i++){Vector3 radial=new Vector3((i%2==0)?.4f:-.4f,.2f,.89f).normalized;velocity=RopePhysics.TangentVelocity(velocity,radial);velocity+=Vector3.ProjectOnPlane(Vector3.forward*3,radial);Assert.That(Vector3.Dot(velocity,radial),Is.EqualTo(0).Within(.001f));}
            Assert.That(velocity.magnitude,Is.GreaterThan(1));
        }
    }
}
