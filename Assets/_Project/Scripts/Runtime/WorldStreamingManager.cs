using UnityEngine;
namespace Skyline
{
    public sealed class WorldStreamingManager : MonoBehaviour
    {
        public Transform player;public Rigidbody body;public float activeDistance=330,prefetchSeconds=2;
        void Update(){if(!player)return;Vector3 predicted=player.position+(body?body.linearVelocity:Vector3.zero)*prefetchSeconds;for(int i=0;i<transform.childCount;i++){Transform c=transform.GetChild(i);if(!c.name.StartsWith("Building"))continue;bool active=(c.position-predicted).sqrMagnitude<activeDistance*activeDistance;if(c.gameObject.activeSelf!=active)c.gameObject.SetActive(active);}}
    }
}
