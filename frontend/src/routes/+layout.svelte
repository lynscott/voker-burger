<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<div class="min-h-screen dark">
{@render children()}
</div>
