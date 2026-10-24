package ma.recrutement.selection;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients
public class SelectionServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(SelectionServiceApplication.class, args);
    }
}
