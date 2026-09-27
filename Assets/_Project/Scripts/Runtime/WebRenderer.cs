using UnityEngine;
namespace Skyline
{
    [RequireComponent(typeof(LineRenderer))]
    public sealed class WebRenderer : MonoBehaviour
    {
        LineRenderer line; Transform hand; Vector3 anchor; float reveal;
        void Awake(){line=GetComponent<LineRenderer>();line.positionCount=0;line.useWorldSpace=true;}
        public void Attach(Transform source,Vector3 point){hand=source;anchor=point;reveal=0;line.positionCount=3;line.enabled=true;}
        public void Release(){line.positionCount=0;line.enabled=false;hand=null;}
        void LateUpdate(){if(!hand||line.positionCount==0)return;reveal=Mathf.MoveTowards(reveal,1,Time.deltaTime*14);Vector3 end=Vector3.Lerp(hand.position,anchor,reveal);Vector3 middle=(hand.position+end)*.5f+Vector3.down*Mathf.Sin(Time.time*9)*.06f;line.SetPosition(0,hand.position);line.SetPosition(1,middle);line.SetPosition(2,end);}
    }
}
