using UnityEngine;
namespace Skyline
{
    [RequireComponent(typeof(PlayerMovement),typeof(WebSwingController),typeof(TraversalAbilities))]
    public sealed class PlayerController : MonoBehaviour
    {
        public GameInput input; public PlayerStateMachine States{get;}=new();
        PlayerMovement movement;WebSwingController swing;TraversalAbilities abilities;Rigidbody body;bool previousSwing;
        void Awake(){movement=GetComponent<PlayerMovement>();swing=GetComponent<WebSwingController>();abilities=GetComponent<TraversalAbilities>();body=GetComponent<Rigidbody>();}
        void Update()
        {
            if(input.SwingHeld&&!previousSwing&&!swing.IsSwinging)swing.TryAttach();
            if(!input.SwingHeld&&previousSwing&&swing.IsSwinging)swing.Release();
            previousSwing=input.SwingHeld;
            if(input.ZipPressed&&!swing.IsSwinging)abilities.TryZip();abilities.Dive(input.SprintHeld&&!movement.Grounded&&body.linearVelocity.y<0);
            UpdateState();
        }
        void FixedUpdate(){movement.Tick(swing.IsSwinging||abilities.IsZipping);if(!swing.IsSwinging&&!abilities.IsZipping)abilities.WallTick(input.Move,input.JumpPressed);}
        void UpdateState(){if(swing.IsSwinging)States.Set(PlayerState.Swinging);else if(abilities.IsZipping)States.Set(PlayerState.WebZip);else if(abilities.IsWallMoving)States.Set(PlayerState.WallRunning);else if(movement.Grounded)States.Set(input.Move.sqrMagnitude>.1f?(input.SprintHeld?PlayerState.Sprinting:PlayerState.Running):PlayerState.Grounded);else States.Set(input.SprintHeld&&body.linearVelocity.y<0?PlayerState.Diving:body.linearVelocity.y>0?PlayerState.Jumping:PlayerState.Falling);}
    }
}
