import { BRAND_LOGO_SRC, BRAND_NAME } from "@/lib/brand";

export default function PageLoader() {
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999 }}>
      {/* Halo spinner container wrapping the logo */}
      <div style={{
        position: "relative",
        width: "200px",
        height: "200px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "3px solid rgba(71, 129, 255, 0.1)",
        boxShadow: "0 0 30px rgba(0, 0, 0, 0.05)",
        animation: "pulse 2s infinite ease-in-out"
      }}>
        {/* Revolving gold border spinner */}
        <div style={{
          position: "absolute",
          inset: "-3px",
          borderRadius: "50%",
          border: "3px solid transparent",
          borderTop: "3px solid #d4af37",
          borderRight: "3px solid rgba(71, 129, 255, 0.1)",
          animation: "spin 1.2s linear infinite"
        }} />

        {/* Logo Image */}
        <img
          src={BRAND_LOGO_SRC}
          alt={BRAND_NAME}
          style={{
            width: "150px",
            height: "auto",
            maxHeight: "75px",
            objectFit: "contain",
            zIndex: 2
          }}
        />
      </div>

      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.8; transform: scale(0.97); }
          50% { opacity: 1; transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
}
