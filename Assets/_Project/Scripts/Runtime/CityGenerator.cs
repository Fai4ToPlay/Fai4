using System.Collections.Generic;
using UnityEngine;
namespace Skyline
{
    public sealed class CityGenerator : MonoBehaviour
    {
        public int radius=5;public float blockSize=70,streetWidth=16;public Material[] materials;readonly List<GameObject> blocks=new();
        public void Generate()
        {
            Clear();var random=new System.Random(7421);
            for(int x=-radius;x<=radius;x++)for(int z=-radius;z<=radius;z++){
                if((x+z)%9==0){CreatePark(x,z);continue;}int lots=2+random.Next(2);
                for(int lx=0;lx<lots;lx++)for(int lz=0;lz<lots;lz++){
                    float usable=blockSize-streetWidth;float footprint=usable/lots-4;float district=Mathf.InverseLerp(radius,0,Mathf.Max(Mathf.Abs(x),Mathf.Abs(z)));
                    float h=Mathf.Lerp(12,95,district)+(float)random.NextDouble()*45;if(Mathf.Abs(x)<=1&&Mathf.Abs(z)<=1)h+=80;
                    Vector3 p=new(x*blockSize+(lx-(lots-1)*.5f)*usable/lots,h*.5f,z*blockSize+(lz-(lots-1)*.5f)*usable/lots);
                    var b=GameObject.CreatePrimitive((lx+lz)%3==0?PrimitiveType.Cylinder:PrimitiveType.Cube);b.name=$"Building_{x}_{z}_{lx}_{lz}";b.transform.SetParent(transform);b.transform.position=p;b.transform.localScale=new Vector3(footprint,h,footprint*((lx+lz)%2==0?.75f:1));
                    b.layer=LayerMask.NameToLayer("Default");var renderer=b.GetComponent<Renderer>();if(materials!=null&&materials.Length>0)renderer.sharedMaterial=materials[random.Next(materials.Length)];renderer.shadowCastingMode=UnityEngine.Rendering.ShadowCastingMode.On;blocks.Add(b);
                }
            }
            var ground=GameObject.CreatePrimitive(PrimitiveType.Cube);ground.name="City Ground";ground.transform.SetParent(transform);ground.transform.position=Vector3.down*1.5f;ground.transform.localScale=new Vector3((radius*2+1)*blockSize,3,(radius*2+1)*blockSize);blocks.Add(ground);
        }
        void CreatePark(int x,int z){var p=GameObject.CreatePrimitive(PrimitiveType.Cube);p.name="Park";p.transform.SetParent(transform);p.transform.position=new Vector3(x*blockSize,.1f,z*blockSize);p.transform.localScale=new Vector3(blockSize-streetWidth,.2f,blockSize-streetWidth);blocks.Add(p);}
        void Clear(){foreach(var b in blocks)if(b)DestroyImmediate(b);blocks.Clear();}
    }
}
