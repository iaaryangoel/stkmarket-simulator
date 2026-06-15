import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Home, ArrowLeft, AlertCircle, Search } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

const NotFound = () => {
  const location = useLocation();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div
      className={`min-h-screen flex items-center justify-center transition-all duration-500 ${
        isDark
          ? "bg-gradient-to-br from-[#02060E] via-[#2a0140] to-[#9303C5]"
          : "bg-gradient-to-br from-gray-50 to-gray-100"
      }`}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`text-center p-8 rounded-2xl max-w-md mx-4 ${
          isDark
            ? "bg-[#02060E]/80 backdrop-blur-sm border border-[#9303C5]/30 shadow-xl"
            : "bg-white shadow-xl"
        }`}
      >
        {/* Animated 404 Number */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="relative"
        >
          <h1
            className={`text-8xl sm:text-9xl font-bold mb-4 ${
              isDark
                ? "bg-gradient-to-r from-[#9303C5] via-[#d8b4fe] to-[#9303C5] bg-clip-text text-transparent"
                : "text-gray-800"
            }`}
          >
            404
          </h1>
          <motion.div
            animate={{
              rotate: [0, 10, -10, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{ repeat: Infinity, duration: 3, repeatDelay: 2 }}
            className="absolute -top-4 -right-4"
          >
            <AlertCircle
              className={`h-8 w-8 ${isDark ? "text-[#9303C5]" : "text-red-500"}`}
            />
          </motion.div>
        </motion.div>

        {/* Error Message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex justify-center mb-4">
            <div
              className={`p-3 rounded-full ${
                isDark ? "bg-[#2a0140]/50" : "bg-gray-100"
              }`}
            >
              <Search
                className={`h-8 w-8 ${isDark ? "text-[#d8b4fe]" : "text-gray-500"}`}
              />
            </div>
          </div>
          <h2
            className={`text-2xl font-semibold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}
          >
            Page Not Found
          </h2>
          <p className={`mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            The page you're looking for doesn't exist or has been moved.
          </p>

          {/* Path info (helpful for debugging) */}
          <div
            className={`mb-6 p-3 rounded-lg text-sm font-mono ${
              isDark
                ? "bg-[#2a0140]/30 text-gray-400"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            <span className="opacity-70">Attempted path:</span>{" "}
            {location.pathname}
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <motion.a
            href="/"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all duration-300 ${
              isDark
                ? "bg-gradient-to-r from-[#9303C5] to-[#6b02b3] text-white hover:shadow-lg hover:shadow-[#9303C5]/50"
                : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-purple-500/30"
            }`}
          >
            <Home className="h-4 w-4" />
            Go to Dashboard
          </motion.a>

          <motion.button
            onClick={() => window.history.back()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all duration-300 border ${
              isDark
                ? "border-[#9303C5]/40 text-[#d8b4fe] hover:bg-[#2a0140]/50"
                : "border-gray-300 text-gray-700 hover:bg-gray-100"
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </motion.button>
        </motion.div>

        {/* Helpful links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className={`mt-6 pt-4 border-t text-xs ${
            isDark
              ? "border-[#9303C5]/20 text-gray-500"
              : "border-gray-200 text-gray-500"
          }`}
        >
          Need help? Contact your administrator
        </motion.div>
      </motion.div>
    </div>
  );
};

export default NotFound;
