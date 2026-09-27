using System;
namespace Skyline
{
    public enum PlayerState { Grounded, Running, Sprinting, Jumping, Falling, Diving, Swinging, WebZip, PointLaunch, WallRunning, WallCrawling, Parkour, AirTrick, Landing }
    public sealed class PlayerStateMachine
    {
        public PlayerState Current { get; private set; } = PlayerState.Falling;
        public event Action<PlayerState, PlayerState> Changed;
        public void Set(PlayerState next) { if (next == Current) return; var previous = Current; Current = next; Changed?.Invoke(previous, next); }
    }
}
